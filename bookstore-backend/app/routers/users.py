from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.models import User, Address
from app.schemas.schemas import (
    UserResponse, 
    UserProfileUpdate, 
    MessageResponse,
    PhoneNumberUpdate
)
from app.middleware.auth_middleware import get_current_user, require_admin

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


@router.patch("/me/phone", response_model=MessageResponse)
async def update_phone_number(
    phone_data: PhoneNumberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's phone number"""
    current_user.phone_number = phone_data.phone_number
    db.commit()
    
    return MessageResponse(message="Phone number updated successfully")


# ============ ADMIN ENDPOINTS ============

@router.get("/admin/all", response_model=List[UserResponse])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all users (Admin only)"""
    users = db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users


@router.patch("/admin/{user_id}/status", response_model=MessageResponse)
async def update_user_status(
    user_id: int,
    is_active: int = Query(..., ge=0, le=1, description="0=inactive/banned, 1=active"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user active status - ban or unban (Admin only)"""
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from banning themselves
    if user.user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status"
        )
    
    user.is_active = is_active
    db.commit()
    
    status_text = "kích hoạt" if is_active else "cấm"
    return MessageResponse(message=f"Đã {status_text} người dùng thành công")