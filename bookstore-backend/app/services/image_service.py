import os
import uuid
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from app.config import settings
import aiofiles
from typing import Tuple
import logging

logger = logging.getLogger(__name__)

class ImageService:
    def __init__(self):
        self.upload_dir = settings.upload_dir
        self.max_file_size = settings.max_file_size
        self.allowed_extensions = settings.get_allowed_extensions()
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Image sizes for optimization
        self.sizes = {
            'thumbnail': (150, 200),
            'medium': (300, 400),
            'large': (600, 800)
        }
    
    def validate_image(self, file: UploadFile):
        """Validate uploaded image file."""
        # Check if file exists
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Check file size
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
            )
        
        # Check file extension
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in self.allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(self.allowed_extensions)}"
            )
    
    def generate_filename(self, original_filename: str) -> str:
        """Generate unique filename."""
        file_extension = original_filename.split('.')[-1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        return unique_filename
    
    async def save_image(self, file: UploadFile, prefix: str = "") -> str:
        """Save uploaded image and create optimized versions."""
        try:
            # Validate image
            self.validate_image(file)
            
            # Generate unique filename with optional prefix
            if prefix:
                base_filename = f"{prefix}_{uuid.uuid4()}"
                file_extension = file.filename.split('.')[-1].lower()
                filename = f"{base_filename}.{file_extension}"
            else:
                filename = self.generate_filename(file.filename)
            
            file_path = os.path.join(self.upload_dir, filename)
            
            # Save original file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Create optimized versions
            await self.create_optimized_versions(file_path, filename)
            
            # Return the relative URL path for database storage
            return f"/static/{filename}"
            
        except HTTPException:
            # Re-raise HTTP exceptions (validation errors)
            raise
        except Exception as e:
            logger.error(f"Error saving image: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving image: {str(e)}"
            )
    
    async def create_optimized_versions(self, original_path: str, filename: str):
        """Create optimized versions of the image."""
        try:
            with Image.open(original_path) as img:
                # Convert to RGB if necessary (for JPEG compatibility)
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                base_name = filename.rsplit('.', 1)[0]
                
                for size_name, (width, height) in self.sizes.items():
                    # Calculate new size maintaining aspect ratio
                    img_copy = img.copy()
                    img_copy.thumbnail((width, height), Image.Resampling.LANCZOS)
                    
                    # Save optimized version
                    optimized_filename = f"{base_name}_{size_name}.webp"
                    optimized_path = os.path.join(self.upload_dir, optimized_filename)
                    
                    img_copy.save(
                        optimized_path,
                        'WEBP',
                        quality=85,
                        optimize=True
                    )
                    
                    logger.info(f"Created optimized image: {optimized_filename}")
                    
        except Exception as e:
            logger.error(f"Error creating optimized versions: {e}")
    
    def get_image_url(self, filename: str, size: str = 'medium') -> str:
        """Get URL for image with specified size."""
        if not filename:
            return None
        
        if size in self.sizes:
            base_name = filename.rsplit('.', 1)[0]
            optimized_filename = f"{base_name}_{size}.webp"
            return f"/static/{optimized_filename}"
        else:
            return f"/static/{filename}"
    
    def get_all_image_urls(self, filename: str) -> dict:
        """Get URLs for all image sizes."""
        if not filename:
            return {}
        
        urls = {}
        base_name = filename.rsplit('.', 1)[0]
        
        # Original image
        urls['original'] = f"/static/{filename}"
        
        # Optimized versions
        for size_name in self.sizes.keys():
            optimized_filename = f"{base_name}_{size_name}.webp"
            urls[size_name] = f"/static/{optimized_filename}"
        
        return urls
    
    async def delete_image(self, filename: str) -> bool:
        """Delete image and all its optimized versions."""
        try:
            if not filename:
                return True
            
            base_name = filename.rsplit('.', 1)[0]
            
            # Delete original file
            original_path = os.path.join(self.upload_dir, filename)
            if os.path.exists(original_path):
                os.remove(original_path)
            
            # Delete optimized versions
            for size_name in self.sizes.keys():
                optimized_filename = f"{base_name}_{size_name}.webp"
                optimized_path = os.path.join(self.upload_dir, optimized_filename)
                if os.path.exists(optimized_path):
                    os.remove(optimized_path)
            
            logger.info(f"Deleted image and optimized versions: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting image: {e}")
            return False


# Image service instance
image_service = ImageService()