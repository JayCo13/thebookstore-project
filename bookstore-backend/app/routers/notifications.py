from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.schemas import NotificationResponse, NotificationCreate, NotificationUpdate, MessageResponse
from app.models.models import Notification
from app.middleware.auth_middleware import require_admin
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/active", response_model=Optional[NotificationResponse])
async def get_active_notification(db: Session = Depends(get_db)):
    """Get the current active notification (public endpoint)."""
    notification = db.query(Notification).filter(
        Notification.is_active == True
    ).order_by(Notification.created_at.desc()).first()
    
    return notification


@router.get("/", response_model=List[NotificationResponse])
async def get_all_notifications(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Get all notifications (Admin only)."""
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).all()
    return notifications


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Create a new notification (Admin only)."""
    db_notification = Notification(**notification.dict())
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification


@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    notification_update: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Update a notification (Admin only)."""
    db_notification = db.query(Notification).filter(
        Notification.notification_id == notification_id
    ).first()
    
    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    update_data = notification_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_notification, field, value)
    
    db_notification.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_notification)
    return db_notification


@router.delete("/{notification_id}", response_model=MessageResponse)
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Delete a notification (Admin only)."""
    db_notification = db.query(Notification).filter(
        Notification.notification_id == notification_id
    ).first()
    
    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db.delete(db_notification)
    db.commit()
    return MessageResponse(message="Notification deleted successfully")


@router.put("/{notification_id}/toggle", response_model=NotificationResponse)
async def toggle_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    """Toggle notification active status (Admin only)."""
    db_notification = db.query(Notification).filter(
        Notification.notification_id == notification_id
    ).first()
    
    if not db_notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    db_notification.is_active = not db_notification.is_active
    db_notification.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_notification)
    return db_notification
