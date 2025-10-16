from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db, get_redis
from app.schemas.schemas import (
    OrderResponse, OrderCreate, OrderUpdate, MessageResponse,
    WishlistResponse, WishlistCreate
)
from app.models.models import Order, OrderItem, Book, User, Wishlist, Address
from app.middleware.auth_middleware import (
    require_customer_or_admin, require_admin, get_current_active_user, get_current_user_optional
)
from app.services.email_service import send_order_confirmation_email
from app.cache.redis_cache import RedisCache, CacheKeys
from redis import Redis
import json

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Create a new order with address management support."""
    try:
        # Calculate total amount
        total_amount = 0
        order_items = []
        
        for item in order.items:
            book = db.query(Book).filter(Book.book_id == item.book_id).first()
            
            if not book:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Book with ID {item.book_id} not found"
                )
            
            if book.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for book: {book.title}"
                )
            
            item_total = book.price * item.quantity
            total_amount += item_total
            
            order_items.append({
                "book_id": book.book_id,
                "quantity": item.quantity,
                "price_at_purchase": book.price
            })
        
        # Handle shipping address for registered users
        shipping_address = None
        if current_user:
            if order.shipping_address_id:
                # Use existing saved address
                shipping_address = db.query(Address).filter(
                    Address.address_id == order.shipping_address_id,
                    Address.user_id == current_user.user_id
                ).first()
                
                if not shipping_address:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Shipping address not found"
                    )
            
            elif order.shipping_address and order.save_address:
                # Create new address and save to profile
                new_address = Address(
                    user_id=current_user.user_id,
                    **order.shipping_address.dict()
                )
                db.add(new_address)
                db.flush()
                shipping_address = new_address
            
            elif order.shipping_address:
                # Use provided address without saving
                shipping_address = order.shipping_address
        
        # Create order
        if current_user:
            # Registered user order
            db_order = Order(
                user_id=current_user.user_id,
                total_amount=total_amount,
                status="Pending"
            )
            
            # Set shipping details from address
            if shipping_address:
                if hasattr(shipping_address, 'phone_number'):  # It's an Address model
                    db_order.shipping_phone_number = shipping_address.phone_number
                    db_order.shipping_address_line1 = shipping_address.address_line1
                    db_order.shipping_address_line2 = shipping_address.address_line2
                    db_order.shipping_city = shipping_address.city
                    db_order.shipping_postal_code = shipping_address.postal_code
                    db_order.shipping_country = shipping_address.country
                else:  # It's an AddressCreate schema
                    db_order.shipping_phone_number = shipping_address.phone_number
                    db_order.shipping_address_line1 = shipping_address.address_line1
                    db_order.shipping_address_line2 = shipping_address.address_line2
                    db_order.shipping_city = shipping_address.city
                    db_order.shipping_postal_code = shipping_address.postal_code
                    db_order.shipping_country = shipping_address.country
        else:
            # Guest order
            db_order = Order(
                user_id=None,
                total_amount=total_amount,
                status="Pending",
                guest_email=order.guest_email,
                shipping_phone_number=order.shipping_phone_number,
                shipping_address_line1=order.shipping_address_line1,
                shipping_address_line2=order.shipping_address_line2,
                shipping_city=order.shipping_city,
                shipping_postal_code=order.shipping_postal_code,
                shipping_country=order.shipping_country
            )
        
        db.add(db_order)
        db.flush()  # Get order_id
        
        # Create order items and update stock
        for item_data in order_items:
            order_item = OrderItem(
                order_id=db_order.order_id,
                book_id=item_data["book_id"],
                quantity=item_data["quantity"],
                price_at_purchase=item_data["price_at_purchase"]
            )
            db.add(order_item)
            
            # Update book stock
            book = db.query(Book).filter(Book.book_id == item_data["book_id"]).first()
            book.stock_quantity -= item_data["quantity"]
        
        db.commit()
        db.refresh(db_order)
        
        # Send order confirmation email
        if current_user:
            await send_order_confirmation_email(
                current_user.email,
                current_user.first_name,
                db_order.order_id,
                total_amount
            )
            
            # Invalidate user's order cache
            cache = RedisCache(redis)
            await cache.delete_pattern(f"orders:user:{current_user.user_id}:*")
        elif order.guest_email:
            await send_order_confirmation_email(
                order.guest_email,
                "Guest",
                db_order.order_id,
                total_amount
            )
        
        return db_order
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )


@router.get("/", response_model=List[OrderResponse])
async def get_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's orders with optional status filtering."""
    cache = RedisCache(redis)
    
    # Create cache key
    cache_key = CacheKeys.user_orders(current_user.user_id, skip, limit, status_filter)
    
    # Try to get from cache
    cached_orders = await cache.get(cache_key)
    if cached_orders:
        return json.loads(cached_orders)
    
    # Build query
    query = db.query(Order).filter(Order.user_id == current_user.user_id)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    orders = query.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()
    orders_response = [OrderResponse.from_orm(order) for order in orders]
    
    # Cache for 5 minutes
    await cache.set(cache_key, json.dumps([order.dict() for order in orders_response]), 300)
    
    return orders_response


@router.get("/all", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all orders (Admin only)."""
    query = db.query(Order)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    if user_id:
        query = query.filter(Order.user_id == user_id)
    
    orders = query.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()
    return [OrderResponse.from_orm(order) for order in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer_or_admin)
):
    """Get a specific order."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user owns the order or is admin
    if current_user.role.role_name != "Admin" and order.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return OrderResponse.from_orm(order)


@router.put("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Update order status (Admin only)."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Update status
    order.status = order_update.status
    db.commit()
    db.refresh(order)
    
    # Invalidate cache
    cache = RedisCache(redis)
    await cache.delete_pattern(f"orders:user:{order.user_id}:*")
    
    return OrderResponse.from_orm(order)


@router.delete("/{order_id}", response_model=MessageResponse)
async def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel an order (only if pending)."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user owns the order or is admin
    if current_user.role.role_name != "Admin" and order.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending orders"
        )
    
    try:
        # Restore stock quantities
        for item in order.order_items:
            book = db.query(Book).filter(Book.book_id == item.book_id).first()
            if book:
                book.stock_quantity += item.quantity
        
        # Update order status
        order.status = "cancelled"
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern(f"orders:user:{order.user_id}:*")
        
        return MessageResponse(message="Order cancelled successfully")
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel order"
        )


# Wishlist endpoints
wishlist_router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


@wishlist_router.get("/", response_model=List[WishlistResponse])
async def get_wishlist(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's wishlist."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.user_wishlist(current_user.user_id)
    cached_wishlist = await cache.get(cache_key)
    if cached_wishlist:
        return json.loads(cached_wishlist)
    
    wishlist_items = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.user_id
    ).all()
    
    wishlist_response = [WishlistResponse.from_orm(item) for item in wishlist_items]
    
    # Cache for 10 minutes
    await cache.set(cache_key, json.dumps([item.dict() for item in wishlist_response]), 600)
    
    return wishlist_response


@wishlist_router.post("/", response_model=MessageResponse)
async def add_to_wishlist(
    wishlist_item: WishlistCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user)
):
    """Add book to wishlist."""
    # Check if book exists
    book = db.query(Book).filter(
        Book.book_id == wishlist_item.book_id,
        Book.is_active == True
    ).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if already in wishlist
    existing = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.user_id,
        Wishlist.book_id == wishlist_item.book_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book already in wishlist"
        )
    
    # Add to wishlist
    wishlist_entry = Wishlist(
        user_id=current_user.user_id,
        book_id=wishlist_item.book_id
    )
    db.add(wishlist_entry)
    db.commit()
    
    # Invalidate cache
    cache = RedisCache(redis)
    await cache.delete(CacheKeys.user_wishlist(current_user.user_id))
    
    return MessageResponse(message="Book added to wishlist")


@wishlist_router.delete("/{book_id}", response_model=MessageResponse)
async def remove_from_wishlist(
    book_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(get_current_active_user)
):
    """Remove book from wishlist."""
    wishlist_item = db.query(Wishlist).filter(
        Wishlist.user_id == current_user.user_id,
        Wishlist.book_id == book_id
    ).first()
    
    if not wishlist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not in wishlist"
        )
    
    db.delete(wishlist_item)
    db.commit()
    
    # Invalidate cache
    cache = RedisCache(redis)
    await cache.delete(CacheKeys.user_wishlist(current_user.user_id))
    
    return MessageResponse(message="Book removed from wishlist")


# Include wishlist router in the main router
router.include_router(wishlist_router)