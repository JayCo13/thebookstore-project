from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.schemas import (
    UserCreate, UserLogin, AdminLoginRequest, UserResponse, Token, MessageResponse,
    PasswordReset, PasswordResetConfirm, GoogleAuthURL, GuestAccountCreate, PhoneNumberUpdate
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
async def admin_login(user_credentials: AdminLoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint with enhanced security and weekly rotating code."""
    from app.services.admin_code_service import validate_code, rotate_code_if_needed
    
    # Email blacklist - known malicious actors
    BLACKLISTED_EMAILS = {
        'thebookstore.vn@gmail.com',
        'the.bookstore.vn@gmail.com'
    }
    
    # Check blacklist first (critical security check)
    normalized_email = user_credentials.email.strip().lower()
    if normalized_email in BLACKLISTED_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. This email has been blocked for security reasons."
        )
    
    # Validate weekly login code BEFORE password check (fail fast)
    if not validate_code(db, user_credentials.login_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired login code. Check your email for the current code."
        )
    
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
            detail="Admin privileges required. Regular user accounts cannot access this area."
        )
    
    # Check if code rotation is needed (async background task)
    try:
        await rotate_code_if_needed(db)
    except Exception as e:
        # Don't fail login if rotation fails, just log it
        logger.error(f"Failed to rotate admin code: {e}")
    
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
    # Check if user with this token exists
    user = db.query(User).filter(User.email_verification_token == token).first()
    
    if not user:
        # Token not found - might be already verified
        # Check if there's an active user (token was cleared after verification)
        already_verified = db.query(User).filter(
            User.email_verification_token == None,
            User.is_active == 1
        ).first()
        
        
        if already_verified:
            # User exists and is active - email was already verified
            # Just show success message instead of "already verified"
            return MessageResponse(message="Email đã được xác minh thành công.")
        
        # Token is invalid
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã xác minh không hợp lệ hoặc đã hết hạn"
        )
    
    # Verify the user
    success = verify_email_token(db, token)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể xác minh email. Vui lòng thử lại."
        )
    
    return MessageResponse(message="Email đã được xác minh thành công. Bạn có thể đăng nhập ngay bây giờ.")


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


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_active_user)):
    """Refresh access token for authenticated user."""
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": current_user.email}, expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/create-from-guest", response_model=Token)
async def create_account_from_guest(
    data: GuestAccountCreate,
    db: Session = Depends(get_db)
):
    """Create a user account from a guest checkout."""
    from app.models.models import Order, Address
    from app.auth.auth import get_password_hash
    
    # Check if email already exists
    existing_user = get_user_by_email(db, data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in instead."
        )
    
    # Verify the order exists and belongs to a guest (only if order_id provided)
    order = None
    if data.order_id:
        order = db.query(Order).filter(Order.order_id == data.order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )
        
        if order.user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This order is already linked to an account"
            )
    
    try:
        # Get customer role
        customer_role = db.query(Role).filter(Role.role_name == "Customer").first()
        if not customer_role:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="System not properly initialized"
            )
        
        # Create new user
        new_user = User(
            role_id=customer_role.role_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email.lower(),
            password_hash=get_password_hash(data.password),
            phone_number=data.phone_number,
            auth_provider="local",
            is_active=1  # Auto-activate since they completed a purchase
        )
        
        db.add(new_user)
        db.flush()  # Get user_id without committing
        
        # Link order to new user (only if order exists)
        if order:
            order.user_id = new_user.user_id
        
        # Create address from order shipping info if available
        if order and order.shipping_address_line1:
            new_address = Address(
                user_id=new_user.user_id,
                phone_number=order.shipping_phone_number or data.phone_number or "",
                address_line1=order.shipping_address_line1,
                address_line2=order.shipping_address_line2,
                city=order.shipping_city or "",
                postal_code=order.shipping_postal_code or "",
                country=order.shipping_country or "Vietnam",
                is_default_shipping=True
            )
            db.add(new_address)
        
        db.commit()
        db.refresh(new_user)
        
        # Send welcome email
        try:
            await send_welcome_email(new_user.email, new_user.first_name)
        except Exception:
            # Don't fail account creation if email fails
            pass
        
        # Create access token and auto-login
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": new_user.email}, expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token, token_type="bearer")
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account"
        )


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


# ============ Zalo OAuth v4 Endpoints ============

from app.services.zalo_service import zalo_service
from app.middleware.auth_middleware import require_admin


@router.get("/zalo/authorize")
async def zalo_authorize(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Start Zalo OAuth flow (Admin only).
    
    Returns the OAuth authorization URL. Frontend should redirect the user to this URL.
    After authorization, Zalo will redirect back to the callback URL.
    """
    if not settings.zalo_app_id or not settings.zalo_app_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Zalo OAuth not configured. Set ZALO_APP_ID and ZALO_APP_SECRET."
        )
    
    if not settings.zalo_callback_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Zalo callback URL not configured. Set ZALO_CALLBACK_URL."
        )
    
    auth_url, state = zalo_service.get_authorization_url(db)
    
    # Return URL as JSON so frontend can handle the redirect
    return {"authorization_url": auth_url, "state": state}


@router.get("/zalo/callback")
async def zalo_callback(
    code: str = None,
    oa_id: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db)
):
    """
    Handle Zalo OAuth callback.
    
    Receives authorization_code from Zalo and exchanges it for access/refresh tokens.
    Stores tokens in database for automatic refresh.
    """
    # Check for errors
    if error:
        return RedirectResponse(
            url=f"{settings.frontend_url}/admin?zalo_error={error}",
            status_code=302
        )
    
    if not code or not oa_id or not state:
        return RedirectResponse(
            url=f"{settings.frontend_url}/admin?zalo_error=missing_params",
            status_code=302
        )
    
    # Exchange code for tokens
    result = await zalo_service.exchange_code_for_tokens(db, code, oa_id, state)
    
    if not result:
        return RedirectResponse(
            url=f"{settings.frontend_url}/admin?zalo_error=token_exchange_failed",
            status_code=302
        )
    
    # Success - redirect to admin dashboard
    return RedirectResponse(
        url=f"{settings.frontend_url}/admin?zalo_connected=true",
        status_code=302
    )


@router.get("/zalo/status", response_model=MessageResponse)
async def zalo_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Check Zalo OAuth connection status (Admin only).
    
    Returns whether Zalo is connected and token status.
    """
    from app.models.zalo_tokens import ZaloToken
    from datetime import datetime
    
    token = db.query(ZaloToken).filter(ZaloToken.oa_id != "pending").first()
    
    if not token:
        return MessageResponse(message="Zalo chưa được kết nối. Vui lòng nhập token ban đầu.")
    
    # Check token status
    now = datetime.utcnow()
    
    if now >= token.refresh_expires_at:
        return MessageResponse(message=f"Zalo OA {token.oa_id}: Refresh token đã hết hạn. Cần nhập token mới.")
    
    if now >= token.expires_at:
        return MessageResponse(message=f"Zalo OA {token.oa_id}: Access token đã hết hạn, sẽ tự động refresh.")
    
    time_left = token.expires_at - now
    hours_left = int(time_left.total_seconds() // 3600)
    
    return MessageResponse(message=f"Zalo OA {token.oa_id}: Đã kết nối. Token còn hiệu lực {hours_left} giờ.")


from pydantic import BaseModel

class ZaloTokenInput(BaseModel):
    access_token: str
    refresh_token: str
    oa_id: str = "default"


@router.post("/zalo/set-tokens", response_model=MessageResponse)
async def zalo_set_tokens(
    token_data: ZaloTokenInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Set initial Zalo tokens (Admin only).
    
    Use this to input the access_token and refresh_token obtained from Zalo.
    The system will automatically refresh the access_token when it expires.
    """
    from app.models.zalo_tokens import ZaloToken
    from datetime import datetime, timedelta
    
    # Check if token already exists
    existing = db.query(ZaloToken).filter(ZaloToken.oa_id == token_data.oa_id).first()
    
    if existing:
        # Update existing tokens
        existing.access_token = token_data.access_token
        existing.refresh_token = token_data.refresh_token
        existing.expires_at = datetime.utcnow() + timedelta(hours=25)  # 25 hours
        existing.refresh_expires_at = datetime.utcnow() + timedelta(days=90)  # 3 months
        existing.code_verifier = None
        existing.state = None
        db.commit()
        return MessageResponse(message=f"Zalo tokens đã được cập nhật cho OA: {token_data.oa_id}")
    
    # Create new token record
    new_token = ZaloToken(
        oa_id=token_data.oa_id,
        access_token=token_data.access_token,
        refresh_token=token_data.refresh_token,
        expires_at=datetime.utcnow() + timedelta(hours=25),
        refresh_expires_at=datetime.utcnow() + timedelta(days=90),
        code_verifier=None,
        state=None
    )
    db.add(new_token)
    db.commit()
    
    return MessageResponse(message=f"Zalo tokens đã được lưu cho OA: {token_data.oa_id}")