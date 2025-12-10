from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.models.models import User, Role
from app.schemas.schemas import TokenData
import secrets
import string

# Password hashing
# Support long passwords safely with bcrypt_sha256, while still verifying existing bcrypt hashes.
pwd_context = CryptContext(schemes=["bcrypt_sha256", "bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash.
    - Uses bcrypt_sha256 for new hashes (supports long passwords).
    - If the stored hash is raw bcrypt and the provided password is very long (>72 chars),
      attempt a truncated verification to avoid bcrypt length errors.
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback for legacy bcrypt hashes with passwords >72 chars
        if hashed_password and hashed_password.startswith("$2") and len(plain_password) > 72:
            try:
                return pwd_context.verify(plain_password[:72], hashed_password)
            except Exception:
                return False
        return False


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def generate_reset_token() -> str:
    """Generate a secure random token for password reset."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))


def generate_email_verification_token() -> str:
    """Generate a secure random token for email verification."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_token(token: str, credentials_exception):
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    return token_data


def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user with email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    
    # Check if user is a Google OAuth user (no password)
    if user.auth_provider == "google" and not user.password_hash:
        return False  # Google users should use OAuth flow
    
    if not user.password_hash or not verify_password(password, user.password_hash):
        return False
    return user


def get_user_by_email(db: Session, email: str):
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(User).filter(User.user_id == user_id).first()


def create_user(db: Session, user_data: dict, role_name: str = "Customer"):
    """Create a new user."""
    # Get role
    role = db.query(Role).filter(Role.role_name == role_name).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role not found"
        )
    
    # Check if user already exists
    if get_user_by_email(db, user_data["email"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data["password"])
    email_verification_token = generate_email_verification_token()
    
    db_user = User(
        role_id=role.role_id,
        first_name=user_data["first_name"],
        last_name=user_data["last_name"],
        email=user_data["email"],
        password_hash=hashed_password,
        is_active=0,  # Requires email verification
        email_verification_token=email_verification_token
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def activate_user(db: Session, email: str):
    """Activate a user account."""
    user = get_user_by_email(db, email)
    if user:
        user.is_active = 1
        db.commit()
        db.refresh(user)
    return user


def verify_email_token(db: Session, token: str):
    """Verify email verification token and activate user."""
    user = db.query(User).filter(User.email_verification_token == token).first()
    if user:
        user.is_active = 1
        user.email_verification_token = None  # Clear the token after verification
        db.commit()
        db.refresh(user)
        return user
    return None


def set_reset_token(db: Session, email: str) -> Optional[str]:
    """Set a password reset token for a user."""
    user = get_user_by_email(db, email)
    if user:
        reset_token = generate_reset_token()
        user.reset_token = reset_token
        db.commit()
        return reset_token
    return None


def reset_password(db: Session, token: str, new_password: str) -> bool:
    """Reset user password using reset token."""
    user = db.query(User).filter(User.reset_token == token).first()
    if user:
        user.password_hash = get_password_hash(new_password)
        user.reset_token = None
        db.commit()
        return True
    return False


def create_admin_user(db: Session):
    """Create the default admin user if it doesn't exist."""
    admin_role = db.query(Role).filter(Role.role_name == "Admin").first()
    if not admin_role:
        admin_role = Role(role_name="Admin")
        db.add(admin_role)
        db.commit()
        db.refresh(admin_role)
    
    # Check if admin user exists
    admin_user = db.query(User).filter(User.email == settings.admin_email).first()
    if not admin_user:
        admin_user = User(
            role_id=admin_role.role_id,
            first_name="Admin",
            last_name="User",
            email=settings.admin_email,
            password_hash=get_password_hash(settings.admin_password),
            is_active=1
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    
    return admin_user


def init_roles(db: Session):
    """Initialize default roles."""
    roles = ["Admin", "Customer"]
    for role_name in roles:
        role = db.query(Role).filter(Role.role_name == role_name).first()
        if not role:
            role = Role(role_name=role_name)
            db.add(role)
    
    db.commit()