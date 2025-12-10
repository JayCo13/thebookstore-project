from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, get_redis
from app.schemas.schemas import CategoryResponse, CategoryCreate
from app.models.models import Category, User
from app.middleware.auth_middleware import require_admin
from app.cache.redis_cache import RedisCache, CacheKeys
from redis import Redis
import json

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get all book categories with caching."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.categories()
    cached_categories = await cache.get(cache_key)
    if cached_categories:
        return json.loads(cached_categories)
    
    categories = db.query(Category).all()
    categories_response = [CategoryResponse.from_orm(cat) for cat in categories]
    
    # Cache for 30 minutes
    await cache.set(cache_key, json.dumps([cat.dict() for cat in categories_response]), 1800)
    
    return categories_response


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Create a new category (Admin only)."""
    try:
        # Create category
        db_category = Category(name=category.name, description=category.description)
        db.add(db_category)
        db.flush()  # Flush to get the ID without committing
        category_id = db_category.category_id
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete(CacheKeys.categories())
        
        return CategoryResponse(
            category_id=category_id,
            name=category.name,
            description=category.description
        )
    
    except Exception as e:
        db.rollback()
        print(f"Error creating category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )