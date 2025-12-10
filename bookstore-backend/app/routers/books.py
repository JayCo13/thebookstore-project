from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db, get_redis
from app.schemas.schemas import (
    BookResponse, BookCreate, BookUpdate, MessageResponse,
    AuthorResponse, CategoryResponse, AuthorCreate, CategoryCreate
)
from app.models.models import Book, Author, Category, User, OrderItem
from app.middleware.auth_middleware import (
    require_admin, require_customer_or_admin, get_current_user_optional
)
from app.services.image_service import ImageService
from app.services.media_service import MediaService
from app.cache.redis_cache import RedisCache, CacheKeys, cache_result
from redis import Redis
import json
import logging
import unicodedata

logger = logging.getLogger(__name__)

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
        return cached_books
    
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
            Book.brief_description.ilike(search_term) |
            Book.full_description.ilike(search_term)
        )
    
    books = query.offset(skip).limit(limit).all()
    
    # Convert to response format and add sales data
    books_response = []
    for book in books:
        # Calculate total sold from order_items
        total_sold = db.query(func.sum(OrderItem.quantity))\
            .filter(OrderItem.book_id == book.book_id)\
            .scalar() or 0
        
        book_dict = BookResponse.from_orm(book).dict()
        book_dict['total_sold'] = int(total_sold)
        books_response.append(BookResponse(**book_dict))
    
    # Cache the result for 5 minutes
    await cache.set(cache_key, [book.dict() for book in books_response], 300)
    
    return books_response


@router.get("/popular", response_model=List[BookResponse])
async def get_popular_books(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get popular books - simplified to return active books, frontend will handle sorting."""
    cache = RedisCache(redis)
    
    # Try to get from cache
    cache_key = f"books:popular_simple:{limit}"
    cached_books = await cache.get(cache_key)
    if cached_books:
        return cached_books
    
    # Simply return active books - frontend will handle popularity logic
    books = db.query(Book).filter(
        Book.is_active == True
    ).limit(limit).all()
    
    books_response = [BookResponse.from_orm(book) for book in books]
    
    # Cache for 1 hour
    await cache.set(cache_key, [book.dict() for book in books_response], 3600)
    
    return books_response


@router.get("/best-sellers", response_model=List[BookResponse])
async def get_best_seller_books(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get books marked as best sellers - simplified to return active books, frontend will handle filtering."""
    cache = RedisCache(redis)
    
    cache_key = f"books:best_sellers_simple:{limit}"
    cached_books = await cache.get(cache_key)
    if cached_books:
        return cached_books
    
    # Simply return active books - frontend will handle best-seller filtering
    books = db.query(Book).filter(
        Book.is_active == True
    ).limit(limit).all()
    
    books_response = [BookResponse.from_orm(book) for book in books]
    
    # Cache for 30 minutes
    await cache.set(cache_key, [book.dict() for book in books_response], 1800)
    
    return books_response


@router.get("/new-releases", response_model=List[BookResponse])
async def get_new_release_books(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get recently published books - simplified to return active books, frontend will handle sorting."""
    cache = RedisCache(redis)
    
    cache_key = f"books:new_releases_simple:{limit}"
    cached_books = await cache.get(cache_key)
    if cached_books:
        return cached_books
    
    # Simply return active books - frontend will handle new release sorting
    books = db.query(Book).filter(
        Book.is_active == True
    ).limit(limit).all()
    
    books_response = [BookResponse.from_orm(book) for book in books]
    
    # Cache for 30 minutes
    await cache.set(cache_key, [book.dict() for book in books_response], 1800)
    
    return books_response


@router.get("/discounted", response_model=List[BookResponse])
async def get_discounted_books(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get books with discounts."""
    cache = RedisCache(redis)
    
    cache_key = f"books:discounted:{limit}"
    cached_books = await cache.get(cache_key)
    if cached_books:
        return json.loads(cached_books)
    
    books = db.query(Book).filter(
        Book.is_active == True,
        Book.is_discount == True
    ).limit(limit).all()
    
    books_response = [BookResponse.from_orm(book) for book in books]
    
    # Cache for 30 minutes
    await cache.set(cache_key, json.dumps([book.dict() for book in books_response]), 1800)
    
    return books_response


@router.get("/slide/{slide_number}", response_model=List[BookResponse])
async def get_slide_books(
    slide_number: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    """Get books for specific slide (1, 2, or 3)."""
    if slide_number not in [1, 2, 3]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slide number must be 1, 2, or 3"
        )
    
    cache = RedisCache(redis)
    
    cache_key = f"books:slide{slide_number}:{limit}"
    cached_books = await cache.get(cache_key)
    if cached_books:
        return json.loads(cached_books)
    
    # Map slide number to field
    slide_field = getattr(Book, f"is_slide{slide_number}")
    
    books = db.query(Book).filter(
        Book.is_active == True,
        slide_field == True
    ).limit(limit).all()
    
    books_response = [BookResponse.from_orm(book) for book in books]
    
    # Cache for 30 minutes
    await cache.set(cache_key, json.dumps([book.dict() for book in books_response]), 1800)
    
    return books_response


@router.get("/categories/", response_model=List[CategoryResponse])
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
        return cached_categories
    
    categories = db.query(Category).all()
    categories_response = [CategoryResponse.from_orm(cat) for cat in categories]
    
    # Cache for 30 minutes
    await cache.set(cache_key, [cat.dict() for cat in categories_response], 1800)
    
    return categories_response


@router.get("/authors/", response_model=List[AuthorResponse])
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
        return cached_authors
    
    authors = db.query(Author).all()
    authors_response = [AuthorResponse.from_orm(author) for author in authors]
    
    # Cache for 30 minutes
    await cache.set(cache_key, [author.dict() for author in authors_response], 1800)
    
    return authors_response


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
        slug = book.slug or _slugify(book.title)
        if slug:
            existing = db.query(Book).filter(Book.slug == slug).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
        db_book = Book(**book.dict(exclude={"author_ids", "category_ids", "slug"}), slug=slug)
        
        # Calculate discounted price if discount is provided
        db_book.calculate_discounted_price()
        
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
        print(f"Error creating book: {str(e)}")  # For immediate debugging
        import traceback
        traceback.print_exc()  # Print full stack trace
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create book: {str(e)}"
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

        if "slug" in update_data and update_data.get("slug"):
            slug = update_data.get("slug")
            existing = db.query(Book).filter(Book.slug == slug, Book.book_id != book_id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
            db_book.slug = slug
        elif "title" in update_data and not db_book.slug:
            slug = _slugify(update_data.get("title") or db_book.title)
            if slug:
                existing = db.query(Book).filter(Book.slug == slug, Book.book_id != book_id).first()
                if not existing:
                    db_book.slug = slug
        
        # Update authors if provided
        if book_update.author_ids is not None:
            authors = db.query(Author).filter(Author.author_id.in_(book_update.author_ids)).all()
            db_book.authors = authors
        
        # Update categories if provided
        if book_update.category_ids is not None:
            categories = db.query(Category).filter(Category.category_id.in_(book_update.category_ids)).all()
            db_book.categories = categories
        
        # Recalculate discounted price if discount fields were updated
        if any(field in update_data for field in ['discount_percentage', 'discount_amount', 'price']):
            db_book.calculate_discounted_price()
        
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
        if db_book.image_url:
            await image_service.delete_image(db_book.image_url)
        
        # Save new image
        image_url = await image_service.save_image(image, f"book_{book_id}")
        
        # Update book with new image URL
        db_book.image_url = image_url
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Book image uploaded successfully")
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading book image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.post("/{book_id}/image2", response_model=MessageResponse)
async def upload_book_image2(
    book_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload and optimize book second image (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        image_service = ImageService()
        
        # Delete old image if exists
        if db_book.image2_url:
            await image_service.delete_image(db_book.image2_url)
        
        # Save new image
        image_url = await image_service.save_image(image, f"book_{book_id}_image2")
        
        # Update book with new image URL
        db_book.image2_url = image_url
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Book second image uploaded successfully")
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading book second image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload second image: {str(e)}"
        )


@router.post("/{book_id}/image3", response_model=MessageResponse)
async def upload_book_image3(
    book_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload and optimize book third image (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        image_service = ImageService()
        
        # Delete old image if exists
        if db_book.image3_url:
            await image_service.delete_image(db_book.image3_url)
        
        # Save new image
        image_url = await image_service.save_image(image, f"book_{book_id}_image3")
        
        # Update book with new image URL
        db_book.image3_url = image_url
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Book third image uploaded successfully")
    
    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, etc.)
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading book third image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload third image: {str(e)}"
        )


@router.post("/{book_id}/read-sample", response_model=MessageResponse)
async def upload_read_sample_images(
    book_id: int,
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload read sample images for a book (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    if len(images) > 10:  # Limit to 10 images
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images allowed for read sample"
        )
    
    try:
        media_service = MediaService()
        
        # Delete old read sample images if exist
        if db_book.read_sample:
            await media_service.delete_read_sample_images(db_book.read_sample)
        
        # Save new read sample images
        read_sample_paths = await media_service.save_read_sample_images(images, book_id)
        
        # Update book with new read sample paths
        db_book.read_sample = read_sample_paths
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Read sample images uploaded successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading read sample images: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload read sample images: {str(e)}"
        )


@router.post("/{book_id}/audio-sample", response_model=MessageResponse)
async def upload_audio_sample(
    book_id: int,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Upload audio sample for a book (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        media_service = MediaService()
        
        # Delete old audio sample if exists
        if db_book.audio_sample:
            await media_service.delete_audio_sample(db_book.audio_sample)
        
        # Save new audio sample
        audio_sample_path = await media_service.save_audio_sample(audio, book_id)
        
        # Update book with new audio sample path
        db_book.audio_sample = audio_sample_path
        db.commit()
        
        # Invalidate cache
        cache = RedisCache(redis)
        await cache.delete_pattern("books:*")
        await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Audio sample uploaded successfully")
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading audio sample: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload audio sample: {str(e)}"
        )


@router.delete("/{book_id}/read-sample", response_model=MessageResponse)
async def delete_read_sample_images(
    book_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Delete read sample images for a book (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        if db_book.read_sample:
            media_service = MediaService()
            await media_service.delete_read_sample_images(db_book.read_sample)
            
            # Update book to remove read sample
            db_book.read_sample = None
            db.commit()
            
            # Invalidate cache
            cache = RedisCache(redis)
            await cache.delete_pattern("books:*")
            await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Read sample images deleted successfully")
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting read sample images: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete read sample images: {str(e)}"
        )


@router.delete("/{book_id}/audio-sample", response_model=MessageResponse)
async def delete_audio_sample(
    book_id: int,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: User = Depends(require_admin)
):
    """Delete audio sample for a book (Admin only)."""
    db_book = db.query(Book).filter(Book.book_id == book_id).first()
    
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    try:
        if db_book.audio_sample:
            media_service = MediaService()
            await media_service.delete_audio_sample(db_book.audio_sample)
            
            # Update book to remove audio sample
            db_book.audio_sample = None
            db.commit()
            
            # Invalidate cache
            cache = RedisCache(redis)
            await cache.delete_pattern("books:*")
            await cache.delete(CacheKeys.book_detail(book_id))
        
        return MessageResponse(message="Audio sample deleted successfully")
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting audio sample: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete audio sample: {str(e)}"
        )
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

@router.get("/slug/{slug}", response_model=BookResponse)
async def get_book_by_slug(
    slug: str,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    cache = RedisCache(redis)
    cache_key = f"books:detail:slug:{slug}"
    cached = await cache.get(cache_key)
    if cached:
        return BookResponse.parse_obj(cached)

    book = db.query(Book).filter(Book.slug == slug, Book.is_active == True).first()
    if not book:
        # Fallback: compute slug from titles and find match, also backfill slug
        candidates = db.query(Book).filter(Book.is_active == True).all()
        for b in candidates:
            if _slugify(b.title) == slug:
                book = b
                if not b.slug:
                    b.slug = slug
                    db.commit()
                break
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    resp = BookResponse.from_orm(book)
    await cache.set(cache_key, resp.dict(), 600)
    return resp
