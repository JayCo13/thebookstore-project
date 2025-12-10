import os
from typing import Optional, List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # Pydantic Settings v2 config: load from .env, accept upper/lower-case vars
    # Use extra="ignore" to allow old env vars that are no longer used
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")
    # Database
    database_url: str = "mysql+pymysql://approot:Hientai12345678990@localhost/bookstore_db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # JWT
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Email
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_from_name: str = "Bookstore"
    
    # Admin
    admin_email: str = "admin@bookstore.com"
    admin_password: str = "admin123"
    
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    frontend_url: str = "http://localhost:3000"
    
    # Image upload settings
    upload_dir: str = "static/images"
    max_file_size: int = 5 * 1024 * 1024  # 5MB
    allowed_extensions: str = "jpg,jpeg,png,webp"
    
    # App settings
    app_name: str = "Bookstore API"
    debug: bool = False
    allowed_origins: str = "http://localhost:3000,http://localhost:8080"
    
    # GHN Configuration
    ghn_api_token: str = ""
    ghn_shop_id: str = ""
    ghn_base_url: str = "https://dev-online-gateway.ghn.vn"

    # Zalo OAuth v4 Configuration
    zalo_app_id: str = ""               # Zalo App ID from Developer Console
    zalo_app_secret: str = ""           # Zalo App Secret Key
    zalo_template_id: str = ""          # ZNS Template ID
    zalo_base_url: str = "https://business.openapi.zalo.me"
    zalo_oauth_url: str = "https://oauth.zaloapp.com/v4"
    zalo_callback_url: str = ""         # OAuth callback URL (must match Zalo Console)

    # AI Chatbot / Vector DB
    groq_api_key: str = ""  # Server-side Groq API key
    groq_api_key_mod: str = ""  # Separate Groq API key for moderation service
    chroma_db_path: str = "chroma_db_store"  # Relative path for Chroma persistence
    
    def get_allowed_extensions(self) -> List[str]:
        """Parse allowed extensions from string to list"""
        if isinstance(self.allowed_extensions, str):
            return [ext.strip() for ext in self.allowed_extensions.split(',') if ext.strip()]
        return []
    
    def get_allowed_origins(self) -> List[str]:
        """Parse allowed origins from string to list"""
        if isinstance(self.allowed_origins, str):
            return [origin.strip() for origin in self.allowed_origins.split(',') if origin.strip()]
        return []
    
    # Legacy Config removed to avoid conflict with model_config


settings = Settings()
