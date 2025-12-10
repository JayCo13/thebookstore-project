from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db, get_redis
from app.schemas.schemas import (
    StationeryResponse, StationeryCreate, StationeryUpdate, MessageResponse, CategoryResponse,
    StationeryReviewResponse, StationeryReviewCreate
)
from app.models.models import Stationery, Category, User, StationeryReview, OrderItem
from app.middleware.auth_middleware import (
    require_admin, get_current_user_optional, get_current_active_user
)
from app.cache.redis_cache import RedisCache, CacheKeys
from app.services.image_service import ImageService
from redis import Redis
import unicodedata

router = APIRouter(prefix="/stationery", tags=["Stationery"])


@router.get("/", response_model=List[StationeryResponse])
async def get_stationery(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    is_best_seller: Optional[bool] = None,
    is_new: Optional[bool] = None,
    is_discount: Optional[bool] = None,
    slide_number: Optional[int] = Query(None, ge=1, le=3),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """List stationery items with optional filtering and caching."""
    cache = RedisCache(redis)
    cache_key = f"stationery:list:{skip}:{limit}:{category_id}:{search}:{is_best_seller}:{is_new}:{is_discount}:{slide_number}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    query = db.query(Stationery).filter(Stationery.is_active == True)

    if category_id:
        query = query.join(Stationery.categories).filter(Category.category_id == category_id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            Stationery.title.ilike(term) |
            Stationery.brief_description.ilike(term) |
            Stationery.full_description.ilike(term)
        )

    if is_best_seller is not None:
        query = query.filter(Stationery.is_best_seller == is_best_seller)
    if is_new is not None:
        query = query.filter(Stationery.is_new == is_new)
    if is_discount is not None:
        query = query.filter(Stationery.is_discount == is_discount)
    if slide_number is not None:
        slide_field = getattr(Stationery, f"is_slide{slide_number}")
        query = query.filter(slide_field == True)

    items = query.offset(skip).limit(limit).all()
    
    # Map model fields to response schema physical fields and add sales data
    resp = []
    for i in items:
        # Calculate total sold from order_items
        total_sold = db.query(func.sum(OrderItem.quantity))\
            .filter(OrderItem.stationery_id == i.stationery_id)\
            .scalar() or 0
        
        r = StationeryResponse.from_orm(i)
        r.height_cm = getattr(i, "height", None)
        r.width_cm = getattr(i, "width", None)
        r.length_cm = getattr(i, "length", None)
        r.weight_grams = getattr(i, "weight", None)
        r.total_sold = int(total_sold)
        resp.append(r)
    await cache.set(cache_key, [r.dict() for r in resp], 300)
    return resp


@router.get("/categories/", response_model=List[CategoryResponse])
async def get_stationery_categories(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    cache = RedisCache(redis)
    cache_key = "stationery:categories"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    categories = (
        db.query(Category)
        .join(Category.stationery)
        .filter(Stationery.is_active == True)
        .distinct()
        .all()
    )

    resp = [CategoryResponse.from_orm(cat) for cat in categories]
    await cache.set(cache_key, [c.dict() for c in resp], 1800)
    return resp


@router.get("/{stationery_id}", response_model=StationeryResponse)
async def get_stationery_item(
    stationery_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get a single stationery item by id with caching."""
    cache = RedisCache(redis)
    cache_key = f"stationery:detail:{stationery_id}"
    cached = await cache.get(cache_key)
    if cached:
        return StationeryResponse.parse_obj(cached)

    item = db.query(Stationery).filter(
        Stationery.stationery_id == stationery_id,
        Stationery.is_active == True
    ).first()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    resp = StationeryResponse.from_orm(item)
    # Map model fields to response schema physical fields
    resp.height_cm = getattr(item, "height", None)
    resp.width_cm = getattr(item, "width", None)
    resp.length_cm = getattr(item, "length", None)
    resp.weight_grams = getattr(item, "weight", None)
    await cache.set(cache_key, resp.dict(), 600)
    return resp


@router.get("/slug/{slug}", response_model=StationeryResponse)
async def get_stationery_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    cache = RedisCache(redis)
    cache_key = f"stationery:detail:slug:{slug}"
    cached = await cache.get(cache_key)
    if cached:
        return StationeryResponse.parse_obj(cached)

    item = db.query(Stationery).filter(Stationery.slug == slug, Stationery.is_active == True).first()
    if not item:
        candidates = db.query(Stationery).filter(Stationery.is_active == True).all()
        for s in candidates:
            if _slugify(s.title) == slug:
                item = s
                if not s.slug:
                    s.slug = slug
                    db.commit()
                break
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    resp = StationeryResponse.from_orm(item)
    resp.height_cm = getattr(item, "height", None)
    resp.width_cm = getattr(item, "width", None)
    resp.length_cm = getattr(item, "length", None)
    resp.weight_grams = getattr(item, "weight", None)
    await cache.set(cache_key, resp.dict(), 600)
    return resp


@router.get("/{stationery_id}/reviews", response_model=List[StationeryReviewResponse])
async def get_stationery_reviews(
    stationery_id: int,
    db: Session = Depends(get_db)
):
    """Get all reviews for a specific stationery item."""
    item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    reviews = (
        db.query(StationeryReview)
        .filter(StationeryReview.stationery_id == stationery_id)
        .order_by(StationeryReview.created_at.desc())
        .all()
    )
    responses: List[StationeryReviewResponse] = []
    for r in reviews:
        user_name = None
        user = r.user
        if user:
            user_name = f"{user.first_name} {user.last_name}".strip()
        resp = StationeryReviewResponse(
            review_id=r.review_id,
            stationery_id=r.stationery_id,
            user_id=r.user_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            user_name=user_name,
            user={"user_id": user.user_id, "name": user_name} if user else None,
            stationery_title=item.title if item else None,
        )
        responses.append(resp)
    return responses


@router.post("/{stationery_id}/reviews", response_model=StationeryReviewResponse)
async def create_stationery_review(
    stationery_id: int,
    review_data: StationeryReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create or update the current user's review for a stationery item."""
    item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    # NOTE: We currently do not enforce purchase verification for stationery
    existing = db.query(StationeryReview).filter(
        StationeryReview.stationery_id == stationery_id,
        StationeryReview.user_id == current_user.user_id
    ).first()

    if existing:
        existing.rating = review_data.rating
        existing.comment = review_data.comment
        db.commit()
        db.refresh(existing)
        user_name = f"{current_user.first_name} {current_user.last_name}".strip()
        return StationeryReviewResponse(
            review_id=existing.review_id,
            stationery_id=existing.stationery_id,
            user_id=existing.user_id,
            rating=existing.rating,
            comment=existing.comment,
            created_at=existing.created_at,
            user_name=user_name,
            user={"user_id": current_user.user_id, "name": user_name},
            stationery_title=item.title
        )

    new_review = StationeryReview(
        stationery_id=stationery_id,
        user_id=current_user.user_id,
        rating=review_data.rating,
        comment=review_data.comment,
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    return StationeryReviewResponse(
        review_id=new_review.review_id,
        stationery_id=new_review.stationery_id,
        user_id=new_review.user_id,
        rating=new_review.rating,
        comment=new_review.comment,
        created_at=new_review.created_at,
        user_name=user_name,
        user={"user_id": current_user.user_id, "name": user_name},
        stationery_title=item.title
    )


@router.post("/", response_model=StationeryResponse)
async def create_stationery(
    stationery: StationeryCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Create a new stationery item (Admin only)."""
    try:
        # Map schema fields to model fields where names differ
        data = stationery.dict(exclude={"category_ids"})
        slug = data.get("slug") or _slugify(data.get("title") or "")
        if slug:
            existing = db.query(Stationery).filter(Stationery.slug == slug).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
        if slug:
            data["slug"] = slug
        # Physical fields: schema uses *_cm and *_grams, model uses height/width/length/weight
        if "height_cm" in data:
            data["height"] = data.pop("height_cm")
        if "width_cm" in data:
            data["width"] = data.pop("width_cm")
        if "length_cm" in data:
            data["length"] = data.pop("length_cm")
        if "weight_grams" in data:
            data["weight"] = data.pop("weight_grams")

        db_item = Stationery(**data)
        db_item.calculate_discounted_price()
        db.add(db_item)
        db.flush()

        if stationery.category_ids:
            cats = db.query(Category).filter(Category.category_id.in_(stationery.category_ids)).all()
            db_item.categories.extend(cats)

        db.commit()
        db.refresh(db_item)

        cache = RedisCache(redis)
        await cache.delete_pattern("stationery:*")

        resp = StationeryResponse.from_orm(db_item)
        # Map model fields to response schema physical fields
        resp.height_cm = getattr(db_item, "height", None)
        resp.width_cm = getattr(db_item, "width", None)
        resp.length_cm = getattr(db_item, "length", None)
        resp.weight_grams = getattr(db_item, "weight", None)
        return resp
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create stationery")


@router.put("/{stationery_id}", response_model=StationeryResponse)
async def update_stationery(
    stationery_id: int,
    update: StationeryUpdate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    db_item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    try:
        data = update.dict(exclude_unset=True, exclude={"category_ids"})
        # Map schema physical fields to model names
        if "height_cm" in data:
            data["height"] = data.pop("height_cm")
        if "width_cm" in data:
            data["width"] = data.pop("width_cm")
        if "length_cm" in data:
            data["length"] = data.pop("length_cm")
        if "weight_grams" in data:
            data["weight"] = data.pop("weight_grams")
        for k, v in data.items():
            setattr(db_item, k, v)

        if "slug" in data and data.get("slug"):
            slug = data.get("slug")
            existing = db.query(Stationery).filter(Stationery.slug == slug, Stationery.stationery_id != stationery_id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
            db_item.slug = slug
        elif "title" in data and not db_item.slug:
            slug = _slugify(data.get("title") or db_item.title)
            if slug:
                existing = db.query(Stationery).filter(Stationery.slug == slug, Stationery.stationery_id != stationery_id).first()
                if not existing:
                    db_item.slug = slug

        if update.category_ids is not None:
            cats = db.query(Category).filter(Category.category_id.in_(update.category_ids)).all()
            db_item.categories = cats

        if any(k in data for k in ["discount_percentage", "discount_amount", "price"]):
            db_item.calculate_discounted_price()

        db.commit()
        db.refresh(db_item)

        cache = RedisCache(redis)
        await cache.delete_pattern("stationery:*")
        await cache.delete(f"stationery:detail:{stationery_id}")

        resp = StationeryResponse.from_orm(db_item)
        # Map model fields to response schema physical fields
        resp.height_cm = getattr(db_item, "height", None)
        resp.width_cm = getattr(db_item, "width", None)
        resp.length_cm = getattr(db_item, "length", None)
        resp.weight_grams = getattr(db_item, "weight", None)
        return resp
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update stationery")


@router.delete("/{stationery_id}", response_model=MessageResponse)
async def delete_stationery(
    stationery_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    db_item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()
    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    db_item.is_active = False
    db.commit()

    cache = RedisCache(redis)
    await cache.delete_pattern("stationery:*")
    await cache.delete(f"stationery:detail:{stationery_id}")

    return MessageResponse(message="Stationery deleted successfully")


# ==================== Image Upload Endpoints ====================

@router.post("/{stationery_id}/image", response_model=MessageResponse)
async def upload_stationery_image(
    stationery_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload and optimize primary stationery image (Admin only)."""
    db_item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()

    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    try:
        image_service = ImageService()

        # Delete old image if exists
        if db_item.image_url:
            await image_service.delete_image(db_item.image_url)

        # Save new image
        image_url = await image_service.save_image(image, f"stationery_{stationery_id}")

        # Update stationery with new image URL
        db_item.image_url = image_url
        db.commit()

        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("stationery:*")
        await cache.delete(f"stationery:detail:{stationery_id}")

        return MessageResponse(message="Stationery image uploaded successfully")
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload image")


@router.post("/{stationery_id}/image2", response_model=MessageResponse)
async def upload_stationery_image2(
    stationery_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload and optimize secondary stationery image (Admin only)."""
    db_item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()

    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    try:
        image_service = ImageService()

        if db_item.image2_url:
            await image_service.delete_image(db_item.image2_url)

        image_url = await image_service.save_image(image, f"stationery_{stationery_id}_image2")

        db_item.image2_url = image_url
        db.commit()

        cache = RedisCache(redis)
        await cache.delete_pattern("stationery:*")
        await cache.delete(f"stationery:detail:{stationery_id}")

        return MessageResponse(message="Stationery second image uploaded successfully")
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload second image")


@router.post("/{stationery_id}/image3", response_model=MessageResponse)
async def upload_stationery_image3(
    stationery_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload and optimize third stationery image (Admin only)."""
    db_item = db.query(Stationery).filter(Stationery.stationery_id == stationery_id).first()

    if not db_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stationery not found")

    try:
        image_service = ImageService()

        if db_item.image3_url:
            await image_service.delete_image(db_item.image3_url)

        image_url = await image_service.save_image(image, f"stationery_{stationery_id}_image3")

        db_item.image3_url = image_url
        db.commit()

        cache = RedisCache(redis)
        await cache.delete_pattern("stationery:*")
        await cache.delete(f"stationery:detail:{stationery_id}")

        return MessageResponse(message="Stationery third image uploaded successfully")
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upload third image")
def _slugify(text: str) -> str:
    if not text:
        return ""
    n = unicodedata.normalize('NFKD', text)
    ascii_text = ''.join(c for c in n if not unicodedata.combining(c))
    ascii_text = ascii_text.lower()
    allowed = []
    for ch in ascii_text:
        if ch.isalnum():
            allowed.append(ch)
        elif ch in [' ', '-', '_']:
            allowed.append('-')
    slug = ''.join(allowed)
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug.strip('-')
