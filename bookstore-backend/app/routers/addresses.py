from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Address, User
from app.schemas.schemas import (
    AddressCreate, 
    AddressUpdate, 
    AddressResponse, 
    AddressListResponse,
    MessageResponse
)
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/addresses", tags=["addresses"])


@router.get("/", response_model=AddressListResponse)
async def get_user_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all addresses for the current user"""
    addresses = db.query(Address).filter(Address.user_id == current_user.user_id).all()
    
    # Find default address
    default_address = db.query(Address).filter(
        Address.user_id == current_user.user_id,
        Address.is_default_shipping == True
    ).first()
    
    default_address_id = default_address.address_id if default_address else None
    
    return AddressListResponse(
        addresses=addresses,
        default_address_id=default_address_id
    )


@router.post("/", response_model=AddressResponse)
async def create_address(
    address_data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new address for the current user"""
    
    # If this is set as default, unset any existing default
    if address_data.is_default_shipping:
        db.query(Address).filter(
            Address.user_id == current_user.user_id,
            Address.is_default_shipping == True
        ).update({"is_default_shipping": False})
    
    # Create new address
    new_address = Address(
        user_id=current_user.user_id,
        **address_data.dict()
    )
    
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    
    return new_address


@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific address by ID"""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.user_id == current_user.user_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    return address


@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    address_data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing address"""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.user_id == current_user.user_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # If setting as default, unset any existing default
    if address_data.is_default_shipping:
        db.query(Address).filter(
            Address.user_id == current_user.user_id,
            Address.is_default_shipping == True
        ).update({"is_default_shipping": False})
    
    # Update address fields
    update_data = address_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(address, field, value)
    
    db.commit()
    db.refresh(address)
    
    return address


@router.delete("/{address_id}", response_model=MessageResponse)
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an address"""
    address = db.query(Address).filter(
        Address.address_id == address_id,
        Address.user_id == current_user.user_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # Check if this is the only address or default address
    user_addresses = db.query(Address).filter(Address.user_id == current_user.user_id).all()
    
    if len(user_addresses) == 1:
        # Allow deletion of the last address
        pass
    elif address.is_default_shipping and len(user_addresses) > 1:
        # If deleting default address, set another address as default
        other_address = db.query(Address).filter(
            Address.user_id == current_user.user_id,
            Address.address_id != address_id
        ).first()
        if other_address:
            other_address.is_default_shipping = True
    
    db.delete(address)
    db.commit()
    
    return MessageResponse(message="Address deleted successfully")


@router.post("/{address_id}/set-default", response_model=AddressResponse)
async def set_default_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set an address as the default shipping address"""
    address = db.query(Address).filter(
        Address.address_id == address_id,
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
    
    # Set this address as default
    address.is_default_shipping = True
    db.commit()
    db.refresh(address)
    
    return address