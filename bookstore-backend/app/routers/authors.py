from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db, get_redis
from app.schemas.schemas import AuthorResponse, AuthorCreate
from app.models.models import Author, User
from app.middleware.auth_middleware import require_admin
from app.cache.redis_cache import RedisCache, CacheKeys
from redis import Redis
import json

router = APIRouter(prefix="/authors", tags=["Authors"])


@router.get("/", response_model=List[AuthorResponse])
async def get_authors(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get all authors with caching."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.authors()
    cached_authors = await cache.get(cache_key)
    if cached_authors:
        return json.loads(cached_authors)
    
    authors = db.query(Author).all()
    authors_response = [AuthorResponse.from_orm(author) for author in authors]
    
    # Cache for 30 minutes
    await cache.set(cache_key, json.dumps([author.dict() for author in authors_response]), 1800)
    
    return authors_response


@router.post("/", response_model=AuthorResponse)
async def create_author(
    author: AuthorCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Create a new author (Admin only)."""
    try:
        # Create author
        db_author = Author(name=author.name, bio=author.bio)
        db.add(db_author)
        db.flush()  # Flush to get the ID without committing
        author_id = db_author.author_id
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete(CacheKeys.authors())
        
        return AuthorResponse(
            author_id=author_id,
            name=author.name,
            bio=author.bio
        )
    
    except Exception as e:
        db.rollback()
        print(f"Error creating author: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create author: {str(e)}"
        )