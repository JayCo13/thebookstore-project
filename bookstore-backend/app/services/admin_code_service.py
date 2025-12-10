from sqlalchemy.orm import Session
from app.models.models import AdminLoginCode
from app.config import settings
from app.services.email_service import send_admin_login_code_email
from datetime import datetime, timedelta
import random
import logging

logger = logging.getLogger(__name__)


def generate_6digit_code() -> str:
    """Generate a random 6-digit code."""
    return str(random.randint(100000, 999999))


async def generate_weekly_code(db: Session) -> str:
    """Generate a new weekly admin login code and email it to admin."""
    try:
        # Deactivate all existing codes
        db.query(AdminLoginCode).update({"is_active": False})
        
        # Generate new code
        code = generate_6digit_code()
        
        # Ensure code is unique
        while db.query(AdminLoginCode).filter(AdminLoginCode.code == code).first():
            code = generate_6digit_code()
        
        # Create new code entry with 7-day expiration
        expires_at = datetime.now() + timedelta(days=7)
        new_code = AdminLoginCode(
            code=code,
            expires_at=expires_at,
            is_active=True
        )
        
        db.add(new_code)
        db.commit()
        db.refresh(new_code)
        
        # Send email to admin
        await send_admin_login_code_email(code, expires_at)
        
        logger.info(f"New admin login code generated and emailed to {settings.admin_email}")
        return code
        
    except Exception as e:
        logger.error(f"Failed to generate admin login code: {e}")
        db.rollback()
        raise


def get_current_code(db: Session) -> AdminLoginCode:
    """Get the current active admin login code."""
    return db.query(AdminLoginCode).filter(
        AdminLoginCode.is_active == True,
        AdminLoginCode.expires_at > datetime.now()
    ).first()


def validate_code(db: Session, code: str) -> bool:
    """Validate if the provided code is correct and not expired."""
    if not code or len(code) != 6:
        return False
    
    current_code = get_current_code(db)
    
    if not current_code:
        return False
    
    return current_code.code == code


async def rotate_code_if_needed(db: Session) -> bool:
    """Check if code needs rotation and rotate if necessary."""
    try:
        current_code = get_current_code(db)
        
        # If no active code or code is expired, generate new one
        if not current_code:
            await generate_weekly_code(db)
            return True
        
        # Check if code is about to expire (less than 1 day remaining)
        time_remaining = current_code.expires_at - datetime.now()
        if time_remaining.total_seconds() < 86400:  # 24 hours
            await generate_weekly_code(db)
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Failed to rotate admin login code: {e}")
        return False


async def initialize_admin_code(db: Session):
    """Initialize admin login code system on first run."""
    try:
        # Check if any code exists
        existing_code = db.query(AdminLoginCode).first()
        
        if not existing_code:
            logger.info("No admin login code found. Generating initial code...")
            await generate_weekly_code(db)
            
    except Exception as e:
        logger.error(f"Failed to initialize admin login code: {e}")
