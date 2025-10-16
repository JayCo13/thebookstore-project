import os
from typing import Optional, List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
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
    
    class Config:
        env_file = ".env"


settings = Settings()