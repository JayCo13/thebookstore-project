from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Book, User, Review
from app.schemas.schemas import (
    ReviewResponse, ReviewCreate, ReviewUpdate, MessageResponse
)
from app.middleware.auth_middleware import (
    get_current_active_user, require_customer_or_admin
)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


books_router = APIRouter(prefix="/books", tags=["Book Reviews"])

@router.get("/", response_model=List[ReviewResponse])
async def list_reviews(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List reviews across all books, ordered by newest.

    Supports simple pagination via `limit` and `offset`.
    """
    reviews = (
        db.query(Review)
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    responses: List[ReviewResponse] = []
    for r in reviews:
        user_name = None
        user = r.user
        if user:
            user_name = f"{user.first_name} {user.last_name}".strip()
        book_title = r.book.title if r.book else None
        resp = ReviewResponse(
            review_id=r.review_id,
            book_id=r.book_id,
            user_id=r.user_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            user_name=user_name,
            user={"user_id": user.user_id, "name": user_name} if user else None,
            book_title=book_title,
        )
        responses.append(resp)
    return responses


@books_router.get("/{book_id}/reviews", response_model=List[ReviewResponse])
async def get_book_reviews(
    book_id: int,
    db: Session = Depends(get_db)
):
    """Get all reviews for a specific book."""
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    reviews = db.query(Review).filter(Review.book_id == book_id).order_by(Review.created_at.desc()).all()
    responses: List[ReviewResponse] = []
    for r in reviews:
        user_name = None
        user = r.user
        if user:
            user_name = f"{user.first_name} {user.last_name}".strip()
        resp = ReviewResponse(
            review_id=r.review_id,
            book_id=r.book_id,
            user_id=r.user_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            user_name=user_name,
            user={"user_id": user.user_id, "name": user_name} if user else None,
        )
        responses.append(resp)
    return responses


@books_router.post("/{book_id}/reviews", response_model=ReviewResponse)
async def create_book_review(
    book_id: int,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create or replace the current user's review for a book."""
    book = db.query(Book).filter(Book.book_id == book_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    # Enforce verified purchase: only users who ordered this book can review
    from app.models.models import Order, OrderItem
    purchased = db.query(OrderItem).join(Order).filter(
        Order.user_id == current_user.user_id,
        OrderItem.book_id == book_id
    ).first()
    if not purchased:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vui lòng mua sách này trước khi đánh giá!"
        )

    # Check if user already reviewed this book; if so, update it
    existing = db.query(Review).filter(
        Review.book_id == book_id,
        Review.user_id == current_user.user_id
    ).first()

    if existing:
        existing.rating = review_data.rating
        existing.comment = review_data.comment
        db.commit()
        db.refresh(existing)
        user_name = f"{current_user.first_name} {current_user.last_name}".strip()
        return ReviewResponse(
            review_id=existing.review_id,
            book_id=existing.book_id,
            user_id=existing.user_id,
            rating=existing.rating,
            comment=existing.comment,
            created_at=existing.created_at,
            user_name=user_name,
            user={"user_id": current_user.user_id, "name": user_name}
        )

    new_review = Review(
        book_id=book_id,
        user_id=current_user.user_id,
        rating=review_data.rating,
        comment=review_data.comment,
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    user_name = f"{current_user.first_name} {current_user.last_name}".strip()
    return ReviewResponse(
        review_id=new_review.review_id,
        book_id=new_review.book_id,
        user_id=new_review.user_id,
        rating=new_review.rating,
        comment=new_review.comment,
        created_at=new_review.created_at,
        user_name=user_name,
        user={"user_id": current_user.user_id, "name": user_name}
    )


@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    review_update: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer_or_admin)
):
    """Update a review. Only owner or admin can update."""
    review = db.query(Review).filter(Review.review_id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    # Allow if admin or owner
    if current_user.role.role_name != "Admin" and review.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    data = review_update.dict(exclude_unset=True)
    if 'rating' in data and data['rating'] is not None:
        review.rating = data['rating']
    if 'comment' in data:
        review.comment = data['comment']

    db.commit()
    db.refresh(review)

    user_name = None
    if review.user:
        user_name = f"{review.user.first_name} {review.user.last_name}".strip()
    return ReviewResponse(
        review_id=review.review_id,
        book_id=review.book_id,
        user_id=review.user_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        user_name=user_name,
        user={"user_id": review.user.user_id, "name": user_name} if review.user else None
    )


@router.delete("/{review_id}", response_model=MessageResponse)
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer_or_admin)
):
    """Delete a review. Only owner or admin can delete."""
    review = db.query(Review).filter(Review.review_id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    if current_user.role.role_name != "Admin" and review.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(review)
    db.commit()
    return MessageResponse(message="Review deleted successfully")


# Include book-scoped review routes under /books
router.include_router(books_router)