from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import asyncio
import logging
from app.config import settings
from app.database import engine, get_db
from app.models.models import Base
from app.routers import auth, books, orders, addresses, users, authors, categories, chat, reviews, moderation, stationery, slides, notifications, seo, import_books
from app.auth.auth import init_roles, create_admin_user

logger = logging.getLogger(__name__)

# Background task for admin code rotation
async def admin_code_rotation_scheduler():
    """Background task that checks and rotates admin login code every hour."""
    from app.services.admin_code_service import rotate_code_if_needed
    
    while True:
        try:
            # Wait 1 hour between checks
            await asyncio.sleep(3600)  # 3600 seconds = 1 hour
            
            # Get a fresh database session
            db = next(get_db())
            try:
                rotated = await rotate_code_if_needed(db)
                if rotated:
                    logger.info("Admin login code was auto-rotated by scheduler")
            except Exception as e:
                logger.error(f"Admin code rotation check failed: {e}")
            finally:
                db.close()
                
        except asyncio.CancelledError:
            logger.info("Admin code rotation scheduler stopped")
            break
        except Exception as e:
            logger.error(f"Admin code scheduler error: {e}")
            # Continue running even on errors
            await asyncio.sleep(60)  # Wait 1 minute before retry on error


# Background task for Zalo token refresh
async def zalo_token_refresh_scheduler():
    """Background task that proactively refreshes Zalo OA tokens before they expire.
    
    Per Zalo v4 docs: access tokens last ~1 hour, so we check every 30 minutes
    and refresh if expiring within 15 minutes.
    """
    from app.services.zalo_service import zalo_service
    from app.models.zalo_tokens import ZaloToken
    from datetime import datetime, timedelta
    
    # Wait 1 minute on startup before first check
    await asyncio.sleep(60)
    
    while True:
        try:
            # Get a fresh database session
            db = next(get_db())
            try:
                # Get all non-pending tokens
                tokens = db.query(ZaloToken).filter(ZaloToken.oa_id != "pending").all()
                
                for token in tokens:
                    now = datetime.utcnow()
                    
                    # Check if refresh token is expired - can't do anything
                    if now >= token.refresh_expires_at:
                        logger.warning(f"Zalo refresh token expired for OA {token.oa_id}. Manual re-authorization required.")
                        continue
                    
                    # Proactively refresh if access token expires within 15 minutes
                    time_until_expiry = token.expires_at - now
                    if time_until_expiry < timedelta(minutes=15):
                        logger.info(f"Zalo access token for OA {token.oa_id} expires in {time_until_expiry}. Refreshing proactively...")
                        
                        new_token = await zalo_service.refresh_access_token(db, token)
                        if new_token:
                            logger.info(f"Zalo token refreshed successfully for OA {token.oa_id}")
                        else:
                            logger.error(f"Failed to refresh Zalo token for OA {token.oa_id}")
                    else:
                        minutes_left = time_until_expiry.total_seconds() / 60
                        logger.debug(f"Zalo token for OA {token.oa_id} still valid for {minutes_left:.1f} minutes")
                        
            except Exception as e:
                logger.error(f"Zalo token refresh check failed: {e}")
            finally:
                db.close()
            
            # Check every 30 minutes (since tokens last ~1 hour)
            await asyncio.sleep(1800)  # 1800 seconds = 30 minutes
                
        except asyncio.CancelledError:
            logger.info("Zalo token refresh scheduler stopped")
            break
        except Exception as e:
            logger.error(f"Zalo token scheduler error: {e}")
            # Wait 5 minutes before retry on error
            await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting up...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize roles and admin user
    db = next(get_db())
    try:
        init_roles(db)
        create_admin_user(db)
        
        # Initialize admin login code system
        from app.services.admin_code_service import initialize_admin_code
        await initialize_admin_code(db)
        
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")
    finally:
        db.close()
    
    # Create upload directories
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "books"), exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "stationery"), exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "optimized"), exist_ok=True)
    
    # Start background schedulers
    admin_rotation_task = asyncio.create_task(admin_code_rotation_scheduler())
    zalo_refresh_task = asyncio.create_task(zalo_token_refresh_scheduler())
    logger.info("Background schedulers started: admin code rotation, zalo token refresh")
    
    yield
    
    # Shutdown - cancel background tasks
    admin_rotation_task.cancel()
    zalo_refresh_task.cancel()
    try:
        await admin_rotation_task
    except asyncio.CancelledError:
        pass
    try:
        await zalo_refresh_task
    except asyncio.CancelledError:
        pass
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Bookstore API",
    description="A comprehensive bookstore backend API with user management, book catalog, orders, and wishlist functionality",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving images
# Get the backend directory (parent of app directory)
backend_dir = os.path.dirname(os.path.dirname(__file__))
static_dir = os.path.join(backend_dir, settings.upload_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(authors.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(addresses.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(reviews.books_router, prefix="/api/v1")
app.include_router(moderation.router, prefix="/api/v1")
app.include_router(stationery.router, prefix="/api/v1")
app.include_router(slides.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(seo.router, prefix="/api/v1")
app.include_router(import_books.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Bookstore API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "message": "Bookstore API is running"}


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Custom 404 handler."""
    return JSONResponse(
        status_code=404,
        content={"detail": "The requested resource was not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Custom 500 handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error occurred"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )