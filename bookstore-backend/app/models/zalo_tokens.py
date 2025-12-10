from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class ZaloToken(Base):
    """
    Store Zalo OAuth tokens for OA (Official Account) integration.
    
    Access tokens expire after 25 hours.
    Refresh tokens expire after 3 months and are single-use.
    When refreshing, both tokens are replaced.
    """
    __tablename__ = "zalo_tokens"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    oa_id = Column(String(50), unique=True, nullable=False, index=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=False)           # Access token expiry
    refresh_expires_at = Column(DateTime, nullable=False)   # Refresh token expiry (3 months)
    code_verifier = Column(String(128), nullable=True)      # Temporary, for OAuth PKCE flow
    state = Column(String(64), nullable=True)               # OAuth state for CSRF protection
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
