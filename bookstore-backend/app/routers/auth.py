from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, Token, MessageResponse,
    PasswordReset, PasswordResetConfirm, GoogleAuthURL
)
from app.auth.auth import (
    authenticate_user, create_user, create_access_token, get_user_by_email,
    set_reset_token, reset_password, activate_user, create_admin_user, init_roles,
    verify_email_token
)
from app.middleware.auth_middleware import get_current_active_user
from app.services.email_service import send_welcome_email, send_password_reset_email
from app.services.google_oauth import google_oauth_service
from app.config import settings
from app.models.models import User, Role

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/register", response_model=MessageResponse)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    try:
        # Create user
        db_user = create_user(db, user.dict())
        
        # Send welcome email with verification token
        await send_welcome_email(db_user.email, db_user.first_name, db_user.email_verification_token)
        
        return MessageResponse(
            message="User registered successfully. Please check your email for confirmation."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=Token)
async def login_user(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return access token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account not activated. Please check your email."
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/admin/login", response_model=Token)
async def admin_login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Admin login endpoint."""
    # Ensure admin user exists
    create_admin_user(db)
    
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is admin
    if user.role.role_name != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(password_reset: PasswordReset, db: Session = Depends(get_db)):
    """Request password reset."""
    user = get_user_by_email(db, password_reset.email)
    
    if not user:
        # Don't reveal if email exists or not for security
        return MessageResponse(
            message="If the email exists, a password reset link has been sent."
        )
    
    # Generate reset token
    reset_token = set_reset_token(db, password_reset.email)
    
    if reset_token:
        # Send password reset email
        await send_password_reset_email(user.email, user.first_name, reset_token)
    
    return MessageResponse(
        message="If the email exists, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_user_password(
    password_reset_confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """Reset password using reset token."""
    success = reset_password(
        db,
        password_reset_confirm.token,
        password_reset_confirm.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return MessageResponse(message="Password reset successfully")


@router.get("/verify-email/{token}", response_model=MessageResponse)
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email address using verification token."""
    success = verify_email_token(db, token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    return MessageResponse(message="Email verified successfully. You can now log in.")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user


@router.post("/logout", response_model=MessageResponse)
async def logout_user(current_user: User = Depends(get_current_active_user)):
    """Logout user (client should discard the token)."""
    # In a stateless JWT system, logout is handled client-side
    # You could implement token blacklisting with Redis if needed
    return MessageResponse(message="Logged out successfully")


@router.post("/activate/{email}", response_model=MessageResponse)
async def activate_user_account(email: str, db: Session = Depends(get_db)):
    """Activate user account (for email verification)."""
    user = activate_user(db, email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return MessageResponse(message="Account activated successfully")


@router.post("/init", response_model=MessageResponse)
async def initialize_system(db: Session = Depends(get_db)):
    """Initialize system with default roles and admin user."""
    try:
        # Initialize roles
        init_roles(db)
        
        # Create admin user
        create_admin_user(db)
        
        return MessageResponse(message="System initialized successfully")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="System initialization failed"
        )


# Google OAuth endpoints
@router.get("/google/login", response_model=GoogleAuthURL)
async def google_login():
    """Get Google OAuth authorization URL."""
    authorization_url = google_oauth_service.get_authorization_url()
    return GoogleAuthURL(authorization_url=authorization_url)


@router.get("/google/callback")
async def google_callback(code: str, state: str = None, db: Session = Depends(get_db)):
    """Handle Google OAuth callback and redirect user to frontend with token."""
    try:
        # Get user info from Google
        google_user_info = await google_oauth_service.authenticate_user(code)
        
        # Check if user exists by Google ID
        existing_user = db.query(User).filter(User.google_id == google_user_info["google_id"]).first()
        
        if existing_user:
            # User exists, login
            if not existing_user.is_active:
                # Redirect to frontend with error
                return RedirectResponse(
                    url=f"{settings.frontend_url}/auth/callback?error=account_deactivated",
                    status_code=302
                )
            
            # Update profile picture if changed
            if google_user_info.get("profile_picture") != existing_user.profile_picture:
                existing_user.profile_picture = google_user_info.get("profile_picture")
                db.commit()
            
            user = existing_user
        else:
            # Check if user exists by email (for linking accounts)
            existing_email_user = db.query(User).filter(User.email == google_user_info["email"]).first()
            
            if existing_email_user:
                # Link Google account to existing user
                existing_email_user.google_id = google_user_info["google_id"]
                existing_email_user.profile_picture = google_user_info.get("profile_picture")
                existing_email_user.auth_provider = "google"
                db.commit()
                user = existing_email_user
            else:
                # Create new user
                customer_role = db.query(Role).filter(Role.role_name == "Customer").first()
                if not customer_role:
                    # Redirect to frontend with error
                    return RedirectResponse(
                        url=f"{settings.frontend_url}/auth/callback?error=system_not_initialized",
                        status_code=302
                    )
                
                new_user = User(
                    role_id=customer_role.role_id,
                    first_name=google_user_info["first_name"],
                    last_name=google_user_info["last_name"],
                    email=google_user_info["email"],
                    google_id=google_user_info["google_id"],
                    profile_picture=google_user_info.get("profile_picture"),
                    auth_provider="google",
                    is_active=1 if google_user_info.get("email_verified", False) else 0
                )
                
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                
                # Send welcome email
                try:
                    await send_welcome_email(new_user.email, new_user.first_name)
                except Exception:
                    # Don't fail registration if email fails
                    pass
                
                user = new_user
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Redirect to frontend with token
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?token={access_token}&type=bearer",
            status_code=302
        )
        
    except HTTPException as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?error=authentication_failed",
            status_code=302
        )
    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?error=server_error",
            status_code=302
        )