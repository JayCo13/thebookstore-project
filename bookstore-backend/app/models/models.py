from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, Date, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Junction tables for many-to-many relationships
book_authors = Table(
    'book_authors',
    Base.metadata,
    Column('book_id', Integer, ForeignKey('books.book_id'), primary_key=True),
    Column('author_id', Integer, ForeignKey('authors.author_id'), primary_key=True)
)

book_categories = Table(
    'book_categories',
    Base.metadata,
    Column('book_id', Integer, ForeignKey('books.book_id'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.category_id'), primary_key=True)
)


class Role(Base):
    __tablename__ = "roles"
    
    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Integer, default=0)  # Changed to 0 - users start inactive until email verified
    reset_token = Column(String(255), nullable=True)
    email_verification_token = Column(String(255), nullable=True)
    
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    profile_picture = Column(String(500), nullable=True)
    auth_provider = Column(String(50), nullable=False, default="local")
    
    # Relationships
    role = relationship("Role", back_populates="users")
    orders = relationship("Order", back_populates="user")
    # NEW: Relationship to the user's saved addresses
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")


# NEW: Address model for registered users
class Address(Base):
    __tablename__ = "addresses"

    address_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    phone_number = Column(String(20), nullable=False)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False)
    is_default_shipping = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="addresses")


class Author(Base):
    __tablename__ = "authors"
    
    author_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    
    books = relationship("Book", secondary=book_authors, back_populates="authors")


class Category(Base):
    __tablename__ = "categories"
    
    category_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    
    books = relationship("Book", secondary=book_categories, back_populates="categories")


class Book(Base):
    __tablename__ = "books"
    
    book_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    isbn = Column(String(13), unique=True, nullable=True)
    description = Column(Text, nullable=True)
    price = Column(DECIMAL(10, 2), nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    publication_date = Column(Date, nullable=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    authors = relationship("Author", secondary=book_authors, back_populates="books")
    categories = relationship("Category", secondary=book_categories, back_populates="books")
    order_items = relationship("OrderItem", back_populates="book")


class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # MODIFIED: user_id is now nullable to allow for guest orders.
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(50), nullable=False, default="Pending")

    # NEW: Fields to store customer info for guest checkouts.
    # These will be NULL if the order is placed by a registered user (user_id is not NULL).
    guest_email = Column(String(255), nullable=True)
    shipping_phone_number = Column(String(20), nullable=True)
    shipping_address_line1 = Column(String(255), nullable=True)
    shipping_address_line2 = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_postal_code = Column(String(20), nullable=True)
    shipping_country = Column(String(100), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    order_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.book_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(DECIMAL(10, 2), nullable=False)
    
    order = relationship("Order", back_populates="order_items")
    book = relationship("Book", back_populates="order_items")


class Wishlist(Base):
    __tablename__ = "wishlists"
    
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    book_id = Column(Integer, ForeignKey("books.book_id"), primary_key=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    book = relationship("Book")