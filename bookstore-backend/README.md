# Bookstore Backend API

A comprehensive FastAPI-based bookstore backend with user management, book catalog, orders, wishlist functionality, Redis caching, and optimized image handling.

## Features

- **User Authentication**: JWT-based authentication with role management (Admin/Customer)
- **Email Integration**: Welcome emails, password reset, order confirmations
- **Book Management**: CRUD operations with image optimization and caching
- **Order System**: Complete order management with inventory tracking
- **Wishlist**: User wishlist functionality
- **Redis Caching**: Fast data retrieval with intelligent cache invalidation
- **Image Optimization**: Automatic image resizing and WebP conversion
- **Role-based Access Control**: Middleware for permission management

## Tech Stack

- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: ORM for database operations
- **MySQL**: Primary database
- **Redis**: Caching layer
- **Alembic**: Database migrations
- **JWT**: Authentication tokens
- **Pillow**: Image processing
- **FastMail**: Email service

## Project Structure

```
bookstore-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config.py              # Configuration settings
│   ├── database.py            # Database connection
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py          # SQLAlchemy models
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py         # Pydantic schemas
│   ├── auth/
│   │   ├── __init__.py
│   │   └── auth.py            # Authentication logic
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth_middleware.py # Role-based middleware
│   ├── cache/
│   │   ├── __init__.py
│   │   └── redis_cache.py     # Redis caching
│   ├── services/
│   │   ├── __init__.py
│   │   ├── email_service.py   # Email functionality
│   │   └── image_service.py   # Image processing
│   └── routers/
│       ├── __init__.py
│       ├── auth.py            # Authentication endpoints
│       ├── books.py           # Book management endpoints
│       └── orders.py          # Order and wishlist endpoints
├── alembic/                   # Database migrations
├── requirements.txt
├── .env.example
└── README.md
```

## Setup Instructions

### 1. Prerequisites

- Python 3.8+
- MySQL 8.0+
- Redis 6.0+

### 2. Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bookstore-backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 3. Configuration

1. Copy environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your settings:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=bookstore

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (Gmail example)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_FROM_NAME=Bookstore

# Admin Account
ADMIN_EMAIL=admin@bookstore.com
ADMIN_PASSWORD=admin123
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp

# App Settings
APP_NAME=Bookstore API
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### 4. Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE bookstore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Initialize Alembic:
```bash
alembic init alembic
```

3. Generate initial migration:
```bash
alembic revision --autogenerate -m "Initial migration"
```

4. Run migrations:
```bash
alembic upgrade head
```

### 5. Start Services

1. Start Redis server:
```bash
redis-server
```

2. Start the application:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/admin/login` - Admin login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/activate/{email}` - Activate account
- `POST /api/v1/auth/init` - Initialize system

### Books
- `GET /api/v1/books/` - Get books (with filtering)
- `GET /api/v1/books/{book_id}` - Get specific book
- `POST /api/v1/books/` - Create book (Admin)
- `PUT /api/v1/books/{book_id}` - Update book (Admin)
- `DELETE /api/v1/books/{book_id}` - Delete book (Admin)
- `POST /api/v1/books/{book_id}/image` - Upload book image (Admin)
- `GET /api/v1/books/categories/` - Get categories
- `GET /api/v1/books/authors/` - Get authors
- `GET /api/v1/books/popular` - Get popular books

### Orders
- `POST /api/v1/orders/` - Create order
- `GET /api/v1/orders/` - Get user orders
- `GET /api/v1/orders/all` - Get all orders (Admin)
- `GET /api/v1/orders/{order_id}` - Get specific order
- `PUT /api/v1/orders/{order_id}/status` - Update order status (Admin)
- `DELETE /api/v1/orders/{order_id}` - Cancel order

### Wishlist
- `GET /api/v1/orders/wishlist/` - Get wishlist
- `POST /api/v1/orders/wishlist/` - Add to wishlist
- `DELETE /api/v1/orders/wishlist/{book_id}` - Remove from wishlist

## Default Admin Account

After initialization, you can login with:
- **Email**: admin@bookstore.com
- **Password**: admin123

## Development

### Running Tests
```bash
pytest
```

### Database Migrations
```bash
# Generate migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Style
The project follows PEP 8 standards. Use tools like `black` and `flake8` for formatting.

## Production Deployment

1. Set `DEBUG=False` in environment
2. Use a production WSGI server like Gunicorn
3. Set up proper SSL certificates
4. Configure reverse proxy (Nginx)
5. Set up monitoring and logging
6. Use environment-specific configurations

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- CORS configuration
- File upload validation

## Performance Features

- Redis caching for frequently accessed data
- Image optimization and multiple sizes
- Database query optimization
- Async/await support
- Connection pooling

## License

This project is licensed under the MIT License.