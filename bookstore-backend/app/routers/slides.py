from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import SlideContent, User
from app.schemas.schemas import SlideContentResponse, SlideContentUpdate
from app.middleware.auth_middleware import require_admin

router = APIRouter(prefix="/slides", tags=["Slides"])


def ensure_default_slides(db: Session):
    """Ensure slide contents exist for slide_number 1..3."""
    existing = {
        sc.slide_number: sc for sc in db.query(SlideContent).filter(SlideContent.slide_number.in_([1, 2, 3])).all()
    }
    created_any = False
    for n in [1, 2, 3]:
        if n not in existing:
            sc = SlideContent(slide_number=n, title=f"Slide {n} Title", body=f"Slide {n} body content")
            db.add(sc)
            created_any = True
    if created_any:
        db.commit()


@router.get("/contents", response_model=List[SlideContentResponse])
async def get_all_slide_contents(db: Session = Depends(get_db)):
    """Return slide contents for slides 1..3, creating defaults if missing."""
    ensure_default_slides(db)
    slides = db.query(SlideContent).filter(SlideContent.slide_number.in_([1, 2, 3])).order_by(SlideContent.slide_number.asc()).all()
    return slides


@router.get("/contents/{slide_number}", response_model=SlideContentResponse)
async def get_slide_content(slide_number: int, db: Session = Depends(get_db)):
    if slide_number not in [1, 2, 3]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slide number must be 1, 2, or 3")
    ensure_default_slides(db)
    sc = db.query(SlideContent).filter(SlideContent.slide_number == slide_number).first()
    if not sc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slide content not found")
    return sc


@router.put("/contents/{slide_number}", response_model=SlideContentResponse)
async def update_slide_content(
    slide_number: int,
    update: SlideContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    if slide_number not in [1, 2, 3]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slide number must be 1, 2, or 3")
    ensure_default_slides(db)
    sc = db.query(SlideContent).filter(SlideContent.slide_number == slide_number).first()
    if not sc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slide content not found")

    data = update.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(sc, field, value)
    db.commit()
    db.refresh(sc)
    return sc