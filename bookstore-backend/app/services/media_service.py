import os
import uuid
import json
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from app.config import settings
import aiofiles
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

class MediaService:
    def __init__(self):
        self.upload_dir = settings.upload_dir
        self.max_file_size = settings.max_file_size
        self.allowed_image_extensions = settings.get_allowed_extensions()
        self.allowed_audio_extensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac']
        
        # Create upload directories if they don't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'read_samples'), exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, 'audio_samples'), exist_ok=True)
        
        # Image sizes for optimization
        self.image_sizes = {
            'thumbnail': (150, 200),
            'medium': (300, 400),
            'large': (600, 800)
        }

    def validate_image(self, file: UploadFile):
        """Validate uploaded image file."""
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {self.max_file_size} bytes"
            )
        
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in self.allowed_image_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image file type not allowed. Allowed types: {', '.join(self.allowed_image_extensions)}"
            )

    def validate_audio(self, file: UploadFile):
        """Validate uploaded audio file."""
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size * 10:  # Allow larger audio files (50MB)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Audio file size exceeds maximum allowed size of {self.max_file_size * 10} bytes"
            )
        
        file_extension = file.filename.split('.')[-1].lower()
        if file_extension not in self.allowed_audio_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Audio file type not allowed. Allowed types: {', '.join(self.allowed_audio_extensions)}"
            )

    def generate_filename(self, original_filename: str, prefix: str = "") -> str:
        """Generate unique filename."""
        file_extension = original_filename.split('.')[-1].lower()
        if prefix:
            unique_filename = f"{prefix}_{uuid.uuid4()}.{file_extension}"
        else:
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
        return unique_filename

    async def save_read_sample_images(self, files: List[UploadFile], book_id: int) -> str:
        """Save multiple read sample images and return JSON string of paths."""
        try:
            image_paths = []
            
            for file in files:
                # Validate each image
                self.validate_image(file)
                
                # Generate unique filename
                filename = self.generate_filename(file.filename, f"read_sample_book_{book_id}")
                file_path = os.path.join(self.upload_dir, 'read_samples', filename)
                
                # Save original file
                async with aiofiles.open(file_path, 'wb') as f:
                    content = await file.read()
                    await f.write(content)
                
                # Create optimized versions
                await self.create_optimized_versions(file_path, filename, 'read_samples')
                
                # Add relative URL path to list
                image_paths.append(f"/static/read_samples/{filename}")
                
                # Reset file position for next iteration
                await file.seek(0)
            
            # Return JSON string of image paths
            return json.dumps(image_paths)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving read sample images: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving read sample images: {str(e)}"
            )

    async def save_audio_sample(self, file: UploadFile, book_id: int) -> str:
        """Save audio sample file and return path."""
        try:
            # Validate audio file
            self.validate_audio(file)
            
            # Generate unique filename
            filename = self.generate_filename(file.filename, f"audio_sample_book_{book_id}")
            file_path = os.path.join(self.upload_dir, 'audio_samples', filename)
            
            # Save audio file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Return relative URL path
            return f"/static/audio_samples/{filename}"
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving audio sample: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving audio sample: {str(e)}"
            )

    async def create_optimized_versions(self, file_path: str, filename: str, subfolder: str = ""):
        """Create optimized versions of images."""
        try:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Create optimized versions
                for size_name, (width, height) in self.image_sizes.items():
                    # Calculate new size maintaining aspect ratio
                    img_ratio = img.width / img.height
                    target_ratio = width / height
                    
                    if img_ratio > target_ratio:
                        # Image is wider, fit to width
                        new_width = width
                        new_height = int(width / img_ratio)
                    else:
                        # Image is taller, fit to height
                        new_height = height
                        new_width = int(height * img_ratio)
                    
                    # Resize image
                    resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    
                    # Save optimized version
                    base_name = os.path.splitext(filename)[0]
                    ext = os.path.splitext(filename)[1]
                    optimized_filename = f"{base_name}_{size_name}{ext}"
                    
                    if subfolder:
                        optimized_path = os.path.join(self.upload_dir, subfolder, optimized_filename)
                    else:
                        optimized_path = os.path.join(self.upload_dir, optimized_filename)
                    
                    resized_img.save(optimized_path, optimize=True, quality=85)
                    
        except Exception as e:
            logger.warning(f"Could not create optimized versions for {filename}: {str(e)}")
            # Don't raise exception as this is not critical

    async def delete_read_sample_images(self, image_paths_json: str):
        """Delete read sample images from JSON string of paths."""
        try:
            if not image_paths_json:
                return
                
            image_paths = json.loads(image_paths_json)
            
            for image_path in image_paths:
                # Convert URL path to file path
                if image_path.startswith('/static/'):
                    file_path = os.path.join(self.upload_dir, image_path[8:])  # Remove '/static/'
                    
                    # Delete main file
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    
                    # Delete optimized versions
                    filename = os.path.basename(file_path)
                    base_name = os.path.splitext(filename)[0]
                    ext = os.path.splitext(filename)[1]
                    
                    for size_name in self.image_sizes.keys():
                        optimized_filename = f"{base_name}_{size_name}{ext}"
                        optimized_path = os.path.join(os.path.dirname(file_path), optimized_filename)
                        if os.path.exists(optimized_path):
                            os.remove(optimized_path)
                            
        except Exception as e:
            logger.warning(f"Could not delete read sample images: {str(e)}")

    async def delete_audio_sample(self, audio_path: str):
        """Delete audio sample file."""
        try:
            if not audio_path:
                return
                
            # Convert URL path to file path
            if audio_path.startswith('/static/'):
                file_path = os.path.join(self.upload_dir, audio_path[8:])  # Remove '/static/'
                
                if os.path.exists(file_path):
                    os.remove(file_path)
                    
        except Exception as e:
            logger.warning(f"Could not delete audio sample: {str(e)}")