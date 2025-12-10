from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from app.config import settings
from app.database import engine, get_db
from app.models.models import Base
from app.routers import auth, books, orders, addresses, users, authors, categories, chat, reviews, moderation, stationery, slides, notifications
from app.auth.auth import init_roles, create_admin_user


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
        import asyncio
        asyncio.run(initialize_admin_code(db))
        
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
    
    yield
    
    # Shutdown
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