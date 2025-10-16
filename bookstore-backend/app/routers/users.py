from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, Address
from app.schemas.schemas import (
    UserResponse, 
    UserProfileUpdate, 
    MessageResponse
)
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile with addresses"""
    # Refresh user data to get latest addresses
    db.refresh(current_user)
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    
    # Handle default_address_id separately
    if profile_data.default_address_id is not None:
        # Verify the address belongs to the user
        address = db.query(Address).filter(
            Address.address_id == profile_data.default_address_id,
            Address.user_id == current_user.user_id
        ).first()
        
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        # Unset any existing default
        db.query(Address).filter(
            Address.user_id == current_user.user_id,
            Address.is_default_shipping == True
        ).update({"is_default_shipping": False})
        
        # Set new default
        address.is_default_shipping = True
    
    # Update user profile fields
    update_data = profile_data.dict(exclude_unset=True, exclude={"default_address_id"})
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user