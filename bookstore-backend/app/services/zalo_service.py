"""
Zalo OA Service with OAuth v4 token management.

This service handles:
1. OAuth v4 with PKCE flow for initial authorization
2. Automatic token refresh before expiration
3. ZNS message sending with valid access tokens
"""
import base64
import hashlib
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.zalo_tokens import ZaloToken

logger = logging.getLogger(__name__)


class ZaloService:
    """Zalo OA service with OAuth v4 PKCE token management."""
    
    def __init__(self):
        self.base_url = settings.zalo_base_url.rstrip('/')
        self.oauth_url = settings.zalo_oauth_url.rstrip('/')
        self.app_id = settings.zalo_app_id
        self.app_secret = settings.zalo_app_secret
        self.template_id = settings.zalo_template_id
        self.callback_url = settings.zalo_callback_url

    def is_configured(self) -> bool:
        """Check if Zalo OAuth is properly configured."""
        return bool(self.app_id and self.app_secret and self.template_id)

    # ============ PKCE Helpers ============

    @staticmethod
    def generate_code_verifier() -> str:
        """Generate a random code_verifier for PKCE (43-128 chars, alphanumeric)."""
        return secrets.token_urlsafe(32)[:43]

    @staticmethod
    def generate_code_challenge(code_verifier: str) -> str:
        """
        Generate code_challenge from code_verifier.
        code_challenge = Base64_URL_Encode(SHA256(ASCII(code_verifier)))
        """
        digest = hashlib.sha256(code_verifier.encode('ascii')).digest()
        # Base64 URL encoding without padding
        return base64.urlsafe_b64encode(digest).decode('ascii').rstrip('=')

    @staticmethod
    def generate_state() -> str:
        """Generate random state for CSRF protection."""
        return secrets.token_urlsafe(16)

    # ============ OAuth Flow ============

    def get_authorization_url(self, db: Session) -> Tuple[str, str]:
        """
        Generate OAuth authorization URL with PKCE.
        Returns (authorization_url, state) tuple.
        """
        code_verifier = self.generate_code_verifier()
        code_challenge = self.generate_code_challenge(code_verifier)
        state = self.generate_state()
        
        # Store code_verifier and state temporarily in database
        # We'll use a placeholder oa_id until we get the real one from callback
        temp_token = db.query(ZaloToken).filter(ZaloToken.oa_id == "pending").first()
        if temp_token:
            temp_token.code_verifier = code_verifier
            temp_token.state = state
            temp_token.updated_at = datetime.utcnow()
        else:
            temp_token = ZaloToken(
                oa_id="pending",
                access_token="",
                refresh_token="",
                expires_at=datetime.utcnow(),
                refresh_expires_at=datetime.utcnow(),
                code_verifier=code_verifier,
                state=state
            )
            db.add(temp_token)
        db.commit()
        
        # Build authorization URL
        params = {
            "app_id": self.app_id,
            "redirect_uri": self.callback_url,
            "code_challenge": code_challenge,
            "state": state
        }
        auth_url = f"{self.oauth_url}/oa/permission?{urlencode(params)}"
        
        logger.info("Generated Zalo OAuth URL with state=%s", state)
        return auth_url, state

    async def exchange_code_for_tokens(
        self, 
        db: Session, 
        authorization_code: str, 
        oa_id: str,
        state: str
    ) -> Optional[Dict[str, Any]]:
        """
        Exchange authorization_code for access_token and refresh_token.
        Uses PKCE code_verifier for security.
        """
        logger.info("Starting token exchange: oa_id=%s, state=%s", oa_id, state)
        
        # Retrieve stored code_verifier
        try:
            temp_token = db.query(ZaloToken).filter(ZaloToken.oa_id == "pending").first()
            logger.info("Retrieved pending token record: %s", temp_token)
        except Exception as e:
            logger.error("Database error retrieving pending token: %s", e)
            return None
        
        if not temp_token:
            logger.error("No pending OAuth flow found in database")
            return None
            
        if temp_token.state != state:
            logger.error("State mismatch: expected=%s, received=%s", temp_token.state, state)
            return None
        
        code_verifier = temp_token.code_verifier
        if not code_verifier:
            logger.error("No code_verifier found for OAuth exchange")
            return None
        
        logger.info("Code verifier found, proceeding with token exchange")
        
        # Make token exchange request
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "secret_key": self.app_secret
        }
        data = {
            "app_id": self.app_id,
            "code": authorization_code,
            "code_verifier": code_verifier,
            "grant_type": "authorization_code"
        }
        
        logger.info("Sending token exchange request to %s/access_token", self.oauth_url)
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.oauth_url}/access_token",
                    headers=headers,
                    data=data,
                    timeout=30.0
                )
            
            logger.info("Zalo token exchange response status: %s", resp.status_code)
            
            if resp.status_code != 200:
                logger.error("Zalo token exchange failed: status=%s body=%s", resp.status_code, resp.text)
                return None
            
            result = resp.json()
            logger.info("Zalo token exchange response: %s", result)
            
            if "access_token" not in result:
                error_msg = result.get("error_description", result.get("message", "Unknown error"))
                logger.error("Zalo token exchange error: %s", error_msg)
                return None
            
            # Store tokens in database
            expires_in = int(result.get("expires_in", 90000))  # Default 25 hours
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            refresh_expires_at = datetime.utcnow() + timedelta(days=90)  # 3 months
            
            # Update the temp token with real data
            temp_token.oa_id = oa_id
            temp_token.access_token = result["access_token"]
            temp_token.refresh_token = result["refresh_token"]
            temp_token.expires_at = expires_at
            temp_token.refresh_expires_at = refresh_expires_at
            temp_token.code_verifier = None  # Clear temporary data
            temp_token.state = None
            db.commit()
            
            logger.info("Zalo tokens stored for OA ID: %s, expires at: %s", oa_id, expires_at)
            return result
            
        except Exception as e:
            logger.error("Error exchanging Zalo authorization code: %s", e)
            return None

    async def refresh_access_token(self, db: Session, token_record: ZaloToken) -> Optional[str]:
        """
        Refresh access token using refresh_token.
        Returns new access_token or None on failure.
        
        Per Zalo OAuth v4 docs:
        - Endpoint: https://oauth.zaloapp.com/v4/access_token
        - Access token validity: ~1 hour (3600 seconds)
        - Refresh token: single-use, max 30 days validity
        """
        logger.info("Attempting Zalo token refresh for OA ID: %s", token_record.oa_id)
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "secret_key": self.app_secret
        }
        data = {
            "app_id": self.app_id,
            "refresh_token": token_record.refresh_token,
            "grant_type": "refresh_token"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.oauth_url}/oa/access_token",  # /oa/access_token for Official Account tokens
                    headers=headers,
                    data=data,
                    timeout=30.0
                )
            
            logger.info("Zalo refresh response status: %s", resp.status_code)
            
            if resp.status_code != 200:
                logger.error("Zalo token refresh failed: status=%s body=%s", resp.status_code, resp.text)
                return None
            
            result = resp.json()
            logger.info("Zalo refresh response: %s", result)
            
            if "access_token" not in result:
                error_code = result.get("error", "unknown")
                error_msg = result.get("error_description", result.get("error_name", "Unknown error"))
                logger.error("Zalo token refresh error: code=%s msg=%s", error_code, error_msg)
                return None
            
            # Update tokens in database
            # Access token: typically 1 hour (3600 seconds)
            expires_in = int(result.get("expires_in", 3600))
            # Refresh token: use API response if available, otherwise default 30 days
            refresh_expires_in = int(result.get("refresh_token_expires_in", 2592000))  # 30 days in seconds
            
            token_record.access_token = result["access_token"]
            token_record.refresh_token = result["refresh_token"]  # IMPORTANT: New single-use refresh token
            token_record.expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            token_record.refresh_expires_at = datetime.utcnow() + timedelta(seconds=refresh_expires_in)
            db.commit()
            
            logger.info("Zalo tokens refreshed successfully for OA ID: %s (access expires in %s sec, refresh expires in %s sec)", 
                       token_record.oa_id, expires_in, refresh_expires_in)
            return result["access_token"]
            
        except Exception as e:
            logger.error("Error refreshing Zalo token: %s", e, exc_info=True)
            return None

    async def get_valid_token(self, db: Session) -> Optional[str]:
        """
        Get a valid access token, automatically refreshing if needed.
        Returns access_token or None if no valid token available.
        
        Per Zalo v4: access tokens last ~1 hour, so we refresh if expiring within 10 minutes.
        """
        # Get the first non-pending token
        token_record = db.query(ZaloToken).filter(ZaloToken.oa_id != "pending").first()
        
        if not token_record:
            logger.error("No Zalo token found in database. Please complete OAuth flow first.")
            return None
        
        # Check if refresh token is expired
        if datetime.utcnow() >= token_record.refresh_expires_at:
            logger.error("Zalo refresh token expired. Please re-authorize the application.")
            return None
        
        # Refresh if access token expires within 10 minutes (tokens last ~1 hour)
        if datetime.utcnow() + timedelta(minutes=10) >= token_record.expires_at:
            logger.info("Zalo access token expiring within 10 minutes, refreshing proactively...")
            return await self.refresh_access_token(db, token_record)
        
        return token_record.access_token

    # ============ Phone Helpers ============

    @staticmethod
    def normalize_phone_to_84(phone: str) -> Optional[str]:
        """Normalize phone number to Vietnamese format (84xxxxxxxxx)."""
        if not phone:
            return None
        raw = re.sub(r"\D+", "", str(phone))
        if not raw:
            return None
        if raw.startswith('0'):
            return '84' + raw[1:]
        if raw.startswith('84'):
            return raw
        if len(raw) >= 9:
            return '84' + raw
        return raw

    @staticmethod
    def safe_tracking_id() -> str:
        """Generate a safe tracking ID for Zalo (max 48 chars)."""
        return uuid.uuid4().hex[:24]

    # ============ ZNS Messaging ============

    async def send_zns(
        self, 
        db: Session,
        phone: str, 
        template_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Send ZNS message with automatic token management.
        
        Args:
            db: Database session for token management
            phone: Recipient phone number
            template_data: Template data for ZNS message
        
        Returns:
            Response data or None on failure
        """
        if not self.is_configured():
            logger.error("ZaloService not configured: app_id, app_secret, or template_id missing")
            return None
        
        # Get valid access token (auto-refreshes if needed)
        access_token = await self.get_valid_token(db)
        if not access_token:
            logger.error("No valid Zalo access token available")
            return None
        
        norm_phone = self.normalize_phone_to_84(phone)
        if not norm_phone:
            logger.error("ZaloService invalid phone; raw=%s", str(phone))
            return None
        
        logger.info("Zalo ZNS send start phone=%s template_id=%s", norm_phone, self.template_id)
        
        headers = {
            "Content-Type": "application/json",
            "access_token": access_token
        }
        payload = {
            "phone": norm_phone,
            "template_id": self.template_id,
            "template_data": template_data
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self.base_url}/message/template",
                    json=payload,
                    headers=headers,
                    timeout=20.0
                )
            
            logger.info("Zalo ZNS response status=%s", resp.status_code)
            
            if resp.status_code != 200:
                logger.error("Zalo ZNS API error status=%s body=%s", resp.status_code, resp.text)
                return None
            
            data = resp.json()
            logger.info("Zalo ZNS response body=%s", data)
            return data
            
        except Exception as e:
            logger.error("Error sending Zalo ZNS: %s", e)
            return None


# Singleton instance
zalo_service = ZaloService()
