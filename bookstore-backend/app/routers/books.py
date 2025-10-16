from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db, get_redis
from app.schemas.schemas import (
    BookResponse, BookCreate, BookUpdate, MessageResponse,
    AuthorResponse, CategoryResponse
)
from app.models.models import Book, Author, Category, User
from app.middleware.auth_middleware import (
    require_admin, require_customer_or_admin, get_current_user_optional
)
from app.services.image_service import ImageService
from app.cache.redis_cache import RedisCache, CacheKeys, cache_result
from redis import Redis
import json

router = APIRouter(prefix="/books", tags=["Books"])


@router.get("/", response_model=List[BookResponse])
async def get_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = None,
    author_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get books with optional filtering and caching."""
    cache = RedisCache(redis)
    
    # Create cache key based on parameters
    cache_key = CacheKeys.books_list(skip, limit, category_id, author_id, search)
    
    # Try to get from cache
    cached_books = await cache.get(cache_key)
    if cached_books:
        return json.loads(cached_books)
    
    # Build query
    query = db.query(Book).filter(Book.is_active == True)
    
    if category_id:
        query = query.join(Book.categories).filter(Category.category_id == category_id)
    
    if author_id:
        query = query.join(Book.authors).filter(Author.author_id == author_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Book.title.ilike(search_term) |
            Book.description.ilike(search_term)
        )
    
    books = query.offset(skip).limit(limit).all()
    
    # Convert to response format
    books_response = [BookResponse.from_orm(book) for book in books]
    
    # Cache the result for 5 minutes
    await cache.set(cache_key, json.dumps([book.dict() for book in books_response]), 300)
    
    return books_response


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get a specific book by ID with caching."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.book_detail(book_id)
    cached_book = await cache.get(cache_key)
    if cached_book:
        return BookResponse.parse_raw(cached_book)
    
    book = db.query(Book).filter(
        Book.book_id == book_id,
        Book.is_active == True
    ).first()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    book_response = BookResponse.from_orm(book)
    
    # Cache for 10 minutes
    await cache.set(cache_key, book_response.json(), 600)
    
    return book_response


@router.post("/", response_model=BookResponse)
async def create_book(
    book: BookCreate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Create a new book (Admin only)."""
    try:
        # Create book
        db_book = Book(**book.dict(exclude={"author_ids", "category_ids"}))
        db.add(db_book)
        db.flush()  # Get the book_id
        
        # Add authors
        if book.author_ids:
            authors = db.query(Author).filter(Author.author_id.in_(book.author_ids)).all()
            db_book.authors.extend(authors)
        
        # Add categories
        if book.category_ids:
            categories = db.query(Category).filter(Category.category_id.in_(book.category_ids)).all()
            db_book.categories.extend(categories)
        
        db.commit()
        db.refresh(db_book)
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        
        return BookResponse.from_orm(db_book)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create book"
        )


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: int,
    book_update: BookUpdate,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Update a book (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        # Update book fields
        update_data = book_update.dict(exclude_unset=True, exclude={"author_ids", "category_ids"})
        for field, value in update_data.items():
            setattr(db_book, field, value)
        
        # Update authors if provided
        if book_update.author_ids is not None:
            authors = db.query(Author).filter(Author.author_id.in_(book_update.author_ids)).all()
            db_book.authors = authors
        
        # Update categories if provided
        if book_update.category_ids is not None:
            categories = db.query(Category).filter(Category.category_id.in_(book_update.category_ids)).all()
            db_book.categories = categories
        
        db.commit()
        db.refresh(db_book)
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return BookResponse.from_orm(db_book)
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update book"
        )


@router.delete("/{book_id}", response_model=MessageResponse)
async def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Soft delete a book (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Soft delete
    db_book.is_active = False
    db.commit()
    
    # Invalidate cache
    cache = RedisCache(redis)
    await cache.delete_pattern("books:*")
    await cache.delete(CacheKeys.book_detail(book_id))
    
    return MessageResponse(message="Book deleted successfully")


@router.post("/{book_id}/image", response_model=MessageResponse)
async def upload_book_image(
    book_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload and optimize book cover image (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        image_service = ImageService()
        
        # Delete old image if exists
        if db_book.cover_image_url:
            await image_service.delete_image(db_book.cover_image_url)
        
        # Upload and optimize new image
        image_url = await image_service.save_image(image, f"book_{book_id}")
        
        # Update book with new image URL
        db_book.cover_image_url = image_url
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Book image uploaded successfully")
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image"
        )


@router.get("/categories/", response_model=List[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get all book categories with caching."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.categories_list()
    cached_categories = await cache.get(cache_key)
    if cached_categories:
        return json.loads(cached_categories)
    
    categories = db.query(Category).all()
    categories_response = [CategoryResponse.from_orm(cat) for cat in categories]
    
    # Cache for 30 minutes
    await cache.set(cache_key, json.dumps([cat.dict() for cat in categories_response]), 1800)
    
    return categories_response


@router.get("/authors/", response_model=List[AuthorResponse])
async def get_authors(
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get all authors with caching."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.authors_list()
    cached_authors = await cache.get(cache_key)
    if cached_authors:
        return json.loads(cached_authors)
    
    authors = db.query(Author).all()
    authors_response = [AuthorResponse.from_orm(author) for author in authors]
    
    # Cache for 30 minutes
    await cache.set(cache_key, json.dumps([author.dict() for author in authors_response]), 1800)
    
    return authors_response


@router.get("/popular", response_model=List[BookResponse])
async def get_popular_books(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get popular books based on order count with caching."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = CacheKeys.popular_books(limit)
    cached_books = await cache.get(cache_key)
    if cached_books:
        return json.loads(cached_books)
    
    # Query popular books (books with most orders)
    popular_books = db.query(Book).join(Book.order_items).filter(
        Book.is_active == True
    ).group_by(Book.book_id).order_by(
        db.func.count(Book.order_items).desc()
    ).limit(limit).all()
    
    books_response = [BookResponse.from_orm(book) for book in popular_books]
    
    # Cache for 1 hour
    await cache.set(cache_key, json.dumps([book.dict() for book in books_response]), 3600)
    
    return books_response