from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import asyncio
from app.database import get_db, get_redis
from app.schemas.schemas import (
    OrderResponse, OrderCreate, OrderUpdate, MessageResponse,
    WishlistResponse, WishlistCreate
)
from app.models.models import Order, OrderItem, Book, Stationery, User, Wishlist, Address
from app.middleware.auth_middleware import (
    require_customer_or_admin, require_admin, get_current_active_user, get_current_user_optional
)
from app.services.email_service import send_order_confirmation_email, send_new_order_admin_notification
from app.services.ghn_service import GHNService
from app.services.zalo_service import ZaloService
from app.cache.redis_cache import RedisCache, CacheKeys
from redis import Redis
import json
import logging
from app.schemas.schemas import GHNStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Create a new order with address management support."""
    import logging
    logger = logging.getLogger(__name__)
    
    # Comprehensive logging of received order data
    logger.info("=== BACKEND ORDER CREATION DEBUG ===")
    logger.info(f"Current User: {current_user.email if current_user else 'Guest User'}")
    logger.info(f"User ID: {current_user.user_id if current_user else 'None'}")
    logger.info(f"Order Items Count: {len(order.items)}")
    for i, item in enumerate(order.items):
        logger.info(f"  Item {i+1}: Book ID {item.book_id}, Quantity {item.quantity}")
    
    logger.info(f"Shipping Address ID: {order.shipping_address_id}")
    logger.info(f"Guest Email: {order.guest_email}")
    logger.info(f"Shipping Phone: {order.shipping_phone_number}")
    logger.info(f"Shipping Address Line 1: {order.shipping_address_line1}")
    logger.info(f"Shipping City: {order.shipping_city}")
    logger.info(f"Shipping Method: {order.shipping_method}")
    logger.info(f"Shipping Fee: {order.shipping_fee}")
    
    # GHN Integration Data
    logger.info("GHN Integration Data:")
    logger.info(f"  Province ID: {order.ghn_province_id}")
    logger.info(f"  District ID: {order.ghn_district_id}")
    logger.info(f"  Ward Code: {order.ghn_ward_code}")
    logger.info(f"  Province Name: {order.ghn_province_name}")
    logger.info(f"  District Name: {order.ghn_district_name}")
    logger.info(f"  Ward Name: {order.ghn_ward_name}")
    logger.info(f"  Service ID: {order.shipping_service_id}")
    
    # Package Information
    logger.info("Package Information:")
    logger.info(f"  Weight: {order.package_weight}")
    logger.info(f"  Length: {order.package_length}")
    logger.info(f"  Width: {order.package_width}")
    logger.info(f"  Height: {order.package_height}")
    
    logger.info("=== END BACKEND ORDER DEBUG ===")
    
    try:
        # Calculate total amount and validate books
        total_amount = 0
        order_items = []
        books_data = {}  # Store book data for GHN
        stationery_data = {}  # Store stationery data for GHN (by ID)
        stationery_order_items = []  # Track stationery items for stock updates
        
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
            
            # Use discounted price if available, otherwise use regular price
            actual_price = book.discounted_price if book.discounted_price is not None else book.price
            item_total = actual_price * item.quantity
            total_amount += item_total
            
            order_items.append({
                "book_id": book.book_id,
                "quantity": item.quantity,
                "price_at_purchase": actual_price
            })
            
            # Store book data for GHN
            books_data[book.book_id] = book
        
        # Collect stationery data from provided GHN items if present
        if getattr(order, 'ghn_items', None):
            for gi in order.ghn_items:
                try:
                    sid = getattr(gi, 'stationery_id', None)
                except Exception:
                    sid = None
                qty = 0
                price = 0
                try:
                    qty = int(getattr(gi, 'quantity', 0) or 0)
                except Exception:
                    qty = 0
                try:
                    price = int(getattr(gi, 'price', 0) or 0)
                except Exception:
                    price = 0
                if sid and qty > 0:
                    st = db.query(Stationery).filter(Stationery.stationery_id == sid).first()
                    if not st:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Stationery with ID {sid} not found"
                        )
                    if st.stock_quantity < qty:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Insufficient stock for stationery: {st.title}"
                        )
                    # Include stationery in total amount; prefer provided price if available
                    total_amount += (price or st.price) * qty
                    stationery_order_items.append({"stationery_id": sid, "quantity": qty})
                    stationery_data[sid] = st
                    # Also persist stationery items as order items
                    order_items.append({
                        "stationery_id": sid,
                        "quantity": qty,
                        "price_at_purchase": (price or st.price)
                    })

        # Do not combine shipping fee into the merchandise total
        
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
        
        # Set GHN fields if provided
        if order.shipping_method:
            db_order.shipping_method = order.shipping_method
        if order.payment_method:
            db_order.payment_method = order.payment_method
        if order.shipping_full_name:
            db_order.shipping_full_name = order.shipping_full_name
        if order.ghn_province_id:
            db_order.ghn_province_id = order.ghn_province_id
        if order.ghn_district_id:
            db_order.ghn_district_id = order.ghn_district_id
        if order.ghn_ward_code:
            db_order.ghn_ward_code = order.ghn_ward_code
        if order.ghn_province_name:
            db_order.ghn_province_name = order.ghn_province_name
        if order.ghn_district_name:
            db_order.ghn_district_name = order.ghn_district_name
        if order.ghn_ward_name:
            db_order.ghn_ward_name = order.ghn_ward_name
        if order.shipping_service_id:
            db_order.shipping_service_id = order.shipping_service_id
        if order.shipping_fee:
            db_order.shipping_fee = order.shipping_fee
        if order.package_weight:
            db_order.package_weight = order.package_weight
        if order.package_length:
            db_order.package_length = order.package_length
        if order.package_width:
            db_order.package_width = order.package_width
        if order.package_height:
            db_order.package_height = order.package_height
        
        # Set cod_amount if payment method is COD
        if order.cod_amount:
            db_order.cod_amount = order.cod_amount
        
        # Create GHN order BEFORE database operations if GHN data is provided
        ghn_order_code = None
        ghn_service = GHNService()
        
        logger.info("=== GHN INTEGRATION DEBUG ===")
        logger.info(f"GHN Service Configured: {ghn_service.is_configured()}")
        logger.info(f"Ward Code: {order.ghn_ward_code} (bool: {bool(order.ghn_ward_code)})")
        logger.info(f"District ID: {order.ghn_district_id} (bool: {bool(order.ghn_district_id)})")
        logger.info(f"Shipping Phone: {order.shipping_phone_number} (bool: {bool(order.shipping_phone_number)})")
        logger.info(f"GHN API Token: {'SET' if ghn_service.api_token else 'NOT SET'}")
        logger.info(f"GHN Shop ID: {'SET' if ghn_service.shop_id else 'NOT SET'}")
        
        if (ghn_service.is_configured() and 
            order.ghn_ward_code and 
            order.ghn_district_id and 
            order.shipping_phone_number):
            
            logger.info("GHN Integration conditions met - proceeding with GHN order creation")
            
            try:
                # Prepare GHN order data directly from request
                logger.info("Preparing GHN order data from request...")
                ghn_order_data = ghn_service.prepare_order_data_from_request(order, books_data, stationery_data)
                logger.info(f"GHN Order Data Prepared: {json.dumps(ghn_order_data, indent=2, default=str)}")
                
                # Create order in GHN
                logger.info("Creating order in GHN system...")
                ghn_response = await ghn_service.create_order(ghn_order_data)
                logger.info(f"GHN Response: {json.dumps(ghn_response, indent=2, default=str)}")
                
                if ghn_response and ghn_response.get("order_code"):
                    ghn_order_code = ghn_response.get("order_code")
                    logger.info(f"GHN order created successfully with code: {ghn_order_code}")
                    logger.info(f"Expected delivery time: {ghn_response.get('expected_delivery_time', 'Not provided')}")
                else:
                    logger.warning("GHN order creation succeeded but no order code returned")
                    
            except Exception as e:
                # Log error but don't fail the order creation
                logger.error(f"Failed to create GHN order: {str(e)}", exc_info=True)
        else:
            logger.info("GHN Integration conditions not met - skipping GHN order creation")
            
        logger.info("=== END GHN INTEGRATION DEBUG ===")
        
        # Set GHN order code if we got one
        if ghn_order_code:
            db_order.ghn_order_code = ghn_order_code

        db.add(db_order)
        db.flush()  # Get order_id
        
        # Create order items and update stock
        for item_data in order_items:
            if item_data.get("book_id"):
                order_item = OrderItem(
                    order_id=db_order.order_id,
                    book_id=item_data["book_id"],
                    quantity=item_data["quantity"],
                    price_at_purchase=item_data["price_at_purchase"]
                )
                db.add(order_item)
                # Update book stock
                book = db.query(Book).filter(Book.book_id == item_data["book_id"]).first()
                if book:
                    book.stock_quantity -= item_data["quantity"]
            elif item_data.get("stationery_id"):
                order_item = OrderItem(
                    order_id=db_order.order_id,
                    stationery_id=item_data["stationery_id"],
                    quantity=item_data["quantity"],
                    price_at_purchase=item_data["price_at_purchase"]
                )
                db.add(order_item)

        # Update stationery stock
        for s_item in stationery_order_items:
            st = db.query(Stationery).filter(Stationery.stationery_id == s_item["stationery_id"]).first()
            if st:
                st.stock_quantity -= s_item["quantity"]
        
        db.commit()
        db.refresh(db_order)

        # After GHN order is created successfully, send Zalo ZNS notification
        try:
            if db_order.ghn_order_code:
                import logging
                logger = logging.getLogger(__name__)
                logger.info("Attempt Zalo ZNS for order_id=%s ghn_order_code=%s", db_order.order_id, db_order.ghn_order_code)
                zalo = ZaloService()
                if zalo.is_configured():
                    total_vnd = int(db_order.total_amount or 0) + int(db_order.shipping_fee or 0)
                    address_parts = [
                        db_order.shipping_address_line1,
                        db_order.ghn_ward_name,
                        db_order.ghn_district_name,
                        db_order.ghn_province_name,
                    ]
                    address = ", ".join([p for p in address_parts if p])
                    items_list = []
                    try:
                        for it in db_order.order_items:
                            t = None
                            try:
                                t = getattr(getattr(it, 'book', None), 'title', None)
                            except Exception:
                                t = None
                            if not t:
                                try:
                                    t = getattr(getattr(it, 'stationery', None), 'title', None)
                                except Exception:
                                    t = None
                            q = 0
                            try:
                                q = int(getattr(it, 'quantity', 0) or 0)
                            except Exception:
                                q = 0
                            if t and q > 0:
                                items_list.append(f"{t} x{q}")
                    except Exception:
                        items_list = []
                    items_str = ", ".join(items_list)
                    if len(items_str) > 200:
                        items_str = items_str[:197] + "..."
                    template_data = {
                        "order_code": db_order.ghn_order_code,
                        "total": total_vnd,
                        "address": address or "",
                        "deli_code": db_order.ghn_order_code,
                        "customer_name": db_order.shipping_full_name or db_order.customer_name or "",
                        "payment_method": (db_order.payment_method or "").upper(),
                        "tracking_id": ZaloService.safe_tracking_id(),
                        "items": items_str,
                    }
                    phone = db_order.shipping_phone_number
                    logger.info("Zalo ZNS payload phone=%s template_id=%s", ZaloService.normalize_phone_to_84(phone), zalo.template_id)
                    await zalo.send_zns(db, phone, template_data)
                else:
                    logger.error("ZaloService not configured; skip sending ZNS")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error("Zalo ZNS send failed for order_id=%s error=%s", db_order.order_id, str(e))
        
        # Send order confirmation email
        try:
            # Send email confirmation to customer
            email_recipient = current_user.email if current_user else order.guest_email
            customer_name = db_order.shipping_full_name or "Khách hàng"
            if email_recipient:
                await send_order_confirmation_email(
                    email_recipient, 
                    customer_name, 
                    db_order.order_id, 
                    int(db_order.total_amount or 0)
                )
                logger.info(f"Order confirmation email sent to {email_recipient}")
        except Exception as e:
            logger.error(f"Failed to send order confirmation email: {str(e)}")
        
        # Send notification to admin
        try:
            await send_new_order_admin_notification(db_order)
        except Exception as e:
            logger.error(f"Failed to send admin notification: {str(e)}")
            
        # Invalidate user's order cache if user is logged in
        try:
            if current_user:
                cache = RedisCache(redis)
                await cache.delete_pattern(f"orders:user:{current_user.user_id}:*")
        except Exception as e:
            logger.error(f"Failed to invalidate cache: {str(e)}")
        
        return db_order
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Order creation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
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
    
    # Cache for 5 minutes - use model_dump with mode='json' to handle datetime serialization
    try:
        serializable_orders = [order.model_dump(mode='json') for order in orders_response]
        await cache.set(cache_key, json.dumps(serializable_orders), 300)
    except Exception as e:
        # Log cache error but don't fail the request
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to cache orders: {str(e)}")
    
    return orders_response


@router.get("/all", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=10000),
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
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get a specific order.
    - Authenticated users: must be admin or owner of the order
    - Guests (no auth): can view guest orders (orders with user_id = None)
    """
    order = db.query(Order).filter(Order.order_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if current_user:
        # Check if user owns the order or is admin
        if current_user.role.role_name != "Admin" and order.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    else:
        # No auth: allow only guest orders
        if order.user_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return OrderResponse.from_orm(order)


@router.get("/{order_id}/shipping-status", response_model=GHNStatusResponse)
async def get_order_shipping_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get GHN shipping status for an order (Admin only)."""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if not order.ghn_order_code:
        return GHNStatusResponse(order_code=None, status=None)
    ghn = GHNService()
    data = await ghn.get_order_detail(order.ghn_order_code)
    status_val = None
    try:
        if isinstance(data, dict):
            status_val = data.get("status") or data.get("current_status") or data.get("Status")
    except Exception:
        status_val = None
    return GHNStatusResponse(order_code=order.ghn_order_code, status=status_val)


@router.get("/{order_id}/my-shipping-status", response_model=GHNStatusResponse)
async def get_my_order_shipping_status(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get GHN shipping status for user's own order."""
    order = db.query(Order).filter(
        Order.order_id == order_id,
        Order.user_id == current_user.user_id  # Only allow user's own orders
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if not order.ghn_order_code:
        return GHNStatusResponse(order_code=None, status=None)
    ghn = GHNService()
    data = await ghn.get_order_detail(order.ghn_order_code)
    status_val = None
    try:
        if isinstance(data, dict):
            status_val = data.get("status") or data.get("current_status") or data.get("Status")
    except Exception:
        status_val = None
    return GHNStatusResponse(order_code=order.ghn_order_code, status=status_val)


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


@router.post("/sync-ghn-status", response_model=MessageResponse)
async def sync_ghn_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Batch sync GHN shipping statuses for all orders with GHN codes (Admin only).
    This endpoint fetches status from GHN API for each order and updates the database.
    Uses parallel requests with limited concurrency for efficiency.
    """
    ghn = GHNService()
    if not ghn.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GHN service is not configured"
        )
    
    # Get all orders with GHN codes that are not completed/cancelled
    orders_to_sync = db.query(Order).filter(
        Order.ghn_order_code.isnot(None),
        Order.ghn_order_code != "",
        ~Order.status.in_(['delivered', 'cancelled', 'returned', 'Delivered', 'Cancelled', 'Returned'])
    ).all()
    
    if not orders_to_sync:
        return MessageResponse(message="Không có đơn hàng cần đồng bộ")
    
    # Limit concurrency to avoid overwhelming GHN API
    semaphore = asyncio.Semaphore(10)
    
    async def fetch_and_update(order):
        async with semaphore:
            try:
                data = await ghn.get_order_detail(order.ghn_order_code)
                if data:
                    new_status = data.get("status")
                    if new_status and new_status != order.status:
                        return (order.order_id, new_status)
            except Exception as e:
                logger.warning(f"Failed to sync GHN status for order {order.order_id}: {e}")
            return None
    
    # Fetch all statuses in parallel
    results = await asyncio.gather(*[fetch_and_update(o) for o in orders_to_sync])
    
    # Update database with new statuses
    updated_count = 0
    for result in results:
        if result:
            order_id, new_status = result
            order = db.query(Order).filter(Order.order_id == order_id).first()
            if order:
                order.status = new_status
                updated_count += 1
    
    if updated_count > 0:
        db.commit()
    
    return MessageResponse(message=f"Đã đồng bộ {updated_count}/{len(orders_to_sync)} đơn hàng từ GHN")


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
            if item.book_id:
                book = db.query(Book).filter(Book.book_id == item.book_id).first()
                if book:
                    book.stock_quantity += item.quantity
            elif item.stationery_id:
                st = db.query(Stationery).filter(Stationery.stationery_id == item.stationery_id).first()
                if st:
                    st.stock_quantity += item.quantity
        
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
