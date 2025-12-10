from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, Date, ForeignKey, Table, Boolean
from sqlalchemy.dialects.mysql import LONGTEXT
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

# Association table for stationery categories
stationery_categories = Table(
    'stationery_categories',
    Base.metadata,
    Column('stationery_id', Integer, ForeignKey('stationery.stationery_id'), primary_key=True),
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
    phone_number = Column(String(20), nullable=True)  # User's primary phone number
    
    # Relationships
    role = relationship("Role", back_populates="users")
    orders = relationship("Order", back_populates="user")
    # NEW: Relationship to the user's saved addresses
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    # NEW: Relationship to reviews
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    # NEW: Relationship to stationery reviews
    stationery_reviews = relationship("StationeryReview", back_populates="user", cascade="all, delete-orphan")


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
    bio = Column(Text, nullable=True)
    
    books = relationship("Book", secondary=book_authors, back_populates="authors")


class Category(Base):
    __tablename__ = "categories"
    
    category_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    books = relationship("Book", secondary=book_categories, back_populates="categories")
    stationery = relationship("Stationery", secondary=stationery_categories, back_populates="categories")


class Book(Base):
    __tablename__ = "books"
    
    book_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=True)
    isbn = Column(String(13), unique=True, nullable=True)
    brief_description = Column(Text, nullable=True)
    full_description = Column(LONGTEXT, nullable=True)
    price = Column(Integer, nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    publication_date = Column(Date, nullable=True)
    image_url = Column(String(500), nullable=True)
    image2_url = Column(String(500), nullable=True)  # Second book image
    image3_url = Column(String(500), nullable=True)  # Third book image
    read_sample = Column(LONGTEXT, nullable=True)  # JSON array of image file paths
    audio_sample = Column(String(500), nullable=True)  # Audio file path
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Book physical information
    publisher = Column(String(255), nullable=True)
    pages = Column(Integer, nullable=True)  # Number of pages
    
    # Physical dimensions for shipping (in cm and grams)
    height = Column(DECIMAL(5, 2), nullable=True)  # Height in cm
    width = Column(DECIMAL(5, 2), nullable=True)   # Width in cm  
    length = Column(DECIMAL(5, 2), nullable=True)  # Length in cm
    weight = Column(Integer, nullable=True)        # Weight in grams
    
    # Position fields for display features
    is_best_seller = Column(Boolean, nullable=False, default=False)
    is_new = Column(Boolean, nullable=False, default=False)
    is_discount = Column(Boolean, nullable=False, default=False)
    is_slide1 = Column(Boolean, nullable=False, default=False)
    is_slide2 = Column(Boolean, nullable=False, default=False)
    is_slide3 = Column(Boolean, nullable=False, default=False)
    is_free_ship = Column(Boolean, nullable=False, default=False)
    
    # Discount pricing fields
    discount_percentage = Column(DECIMAL(5, 2), nullable=True)  # e.g., 15.50 for 15.5%
    discount_amount = Column(Integer, nullable=True)     # Fixed discount amount
    discounted_price = Column(Integer, nullable=True)   # Calculated discounted price
    
    authors = relationship("Author", secondary=book_authors, back_populates="books")
    categories = relationship("Category", secondary=book_categories, back_populates="books")
    order_items = relationship("OrderItem", back_populates="book")
    # NEW: Relationship to reviews
    reviews = relationship("Review", back_populates="book", cascade="all, delete-orphan")
    
    def calculate_discounted_price(self):
        """Calculate and set the discounted price based on percentage or amount."""
        if self.discount_percentage:
            # Calculate discount based on percentage
            discount_value = self.price * (self.discount_percentage / 100)
            self.discounted_price = self.price - discount_value
        elif self.discount_amount:
            # Calculate discount based on fixed amount
            self.discounted_price = max(self.price - self.discount_amount, 0)
        else:
            # No discount
            self.discounted_price = None
        
        # Set is_discount flag based on whether there's a discount
        self.is_discount = bool(self.discount_percentage or self.discount_amount)


class Stationery(Base):
    __tablename__ = "stationery"

    stationery_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=True)
    sku = Column(String(50), unique=True, nullable=True)
    brief_description = Column(Text, nullable=True)
    full_description = Column(LONGTEXT, nullable=True)
    price = Column(Integer, nullable=False)
    stock_quantity = Column(Integer, nullable=False, default=0)
    image_url = Column(String(500), nullable=True)
    image2_url = Column(String(500), nullable=True)
    image3_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Physical dimensions for shipping (in cm and grams)
    height = Column(DECIMAL(5, 2), nullable=True)
    width = Column(DECIMAL(5, 2), nullable=True)
    length = Column(DECIMAL(5, 2), nullable=True)
    weight = Column(Integer, nullable=True)

    # Position flags similar to books
    is_best_seller = Column(Boolean, nullable=False, default=False)
    is_new = Column(Boolean, nullable=False, default=False)
    is_discount = Column(Boolean, nullable=False, default=False)
    is_slide1 = Column(Boolean, nullable=False, default=False)
    is_slide2 = Column(Boolean, nullable=False, default=False)
    is_slide3 = Column(Boolean, nullable=False, default=False)
    is_free_ship = Column(Boolean, nullable=False, default=False)

    # Discount fields
    discount_percentage = Column(DECIMAL(5, 2), nullable=True)
    discount_amount = Column(Integer, nullable=True)
    discounted_price = Column(Integer, nullable=True)

    # Relationships
    categories = relationship("Category", secondary=stationery_categories, back_populates="stationery")
    # Reviews relationship for stationery
    reviews = relationship("StationeryReview", back_populates="stationery", cascade="all, delete-orphan")

    def calculate_discounted_price(self):
        if self.discount_percentage:
            try:
                percent = float(self.discount_percentage)
            except Exception:
                percent = 0.0
            self.discounted_price = int(self.price * (100 - percent) / 100)
        elif self.discount_amount:
            self.discounted_price = max(0, self.price - int(self.discount_amount))
        else:
            self.discounted_price = None


# NEW: StationeryReview model for stationery ratings and comments
class StationeryReview(Base):
    __tablename__ = "stationery_reviews"

    review_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    stationery_id = Column(Integer, ForeignKey("stationery.stationery_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    stationery = relationship("Stationery", back_populates="reviews")
    user = relationship("User", back_populates="stationery_reviews")


class Order(Base):
    __tablename__ = "orders"
    
    order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # MODIFIED: user_id is now nullable to allow for guest orders.
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    order_date = Column(DateTime(timezone=True), server_default=func.now())
    total_amount = Column(Integer, nullable=False)
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
    
    # GHN Integration Fields
    shipping_method = Column(String(100), nullable=True)
    payment_method = Column(String(100), nullable=True)
    cod_amount = Column(Integer, nullable=True)
    shipping_full_name = Column(String(255), nullable=True)
    ghn_order_code = Column(String(50), nullable=True, index=True)
    ghn_province_id = Column(Integer, nullable=True)
    ghn_district_id = Column(Integer, nullable=True)
    ghn_ward_code = Column(String(20), nullable=True)
    ghn_province_name = Column(String(100), nullable=True)
    ghn_district_name = Column(String(100), nullable=True)
    ghn_ward_name = Column(String(100), nullable=True)
    shipping_service_id = Column(Integer, nullable=True)
    shipping_fee = Column(Integer, nullable=True)
    package_weight = Column(Integer, nullable=True)
    package_length = Column(Integer, nullable=True)
    package_width = Column(Integer, nullable=True)
    package_height = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    order_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.book_id"), nullable=True)
    stationery_id = Column(Integer, ForeignKey("stationery.stationery_id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Integer, nullable=False)
    
    order = relationship("Order", back_populates="order_items")
    book = relationship("Book", back_populates="order_items")
    stationery = relationship("Stationery")


class Wishlist(Base):
    __tablename__ = "wishlists"
    
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    book_id = Column(Integer, ForeignKey("books.book_id"), primary_key=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    book = relationship("Book")


# NEW: Review model for book ratings and comments
class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey("books.book_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    book = relationship("Book", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


# NEW: SlideContent model for homepage hero slides
class SlideContent(Base):
    __tablename__ = "slide_contents"

    slide_content_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Slide number: 1, 2, or 3
    slide_number = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    # Optional design colors controlled by admin
    title_color = Column(String(20), nullable=True)
    body_color = Column(String(20), nullable=True)
    primary_button_bg_color = Column(String(20), nullable=True)
    primary_button_text_color = Column(String(20), nullable=True)
    secondary_button_bg_color = Column(String(20), nullable=True)
    secondary_button_text_color = Column(String(20), nullable=True)
    # Optional button labels
    primary_button_label = Column(String(255), nullable=True)
    secondary_button_label = Column(String(255), nullable=True)
    # Optional button URLs
    primary_button_url = Column(String(500), nullable=True)
    secondary_button_url = Column(String(500), nullable=True)
    # Selected item to display on the slide (book or stationery)
    selected_item_type = Column(String(20), nullable=True)  # 'book' or 'stationery'
    selected_item_id = Column(Integer, nullable=True)
    # Font properties for title and body text
    title_font_size = Column(String(10), nullable=True)
    body_font_size = Column(String(10), nullable=True)
    title_font_family = Column(String(50), nullable=True)
    body_font_family = Column(String(50), nullable=True)
    # Image dimensions
    image_width = Column(String(10), nullable=True)
    image_height = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# NEW: AdminLoginCode model for weekly rotating admin login codes
class AdminLoginCode(Base):
    __tablename__ = "admin_login_codes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(6), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


# Notification model for admin-managed banners
class Notification(Base):
    __tablename__ = "notifications"
    
    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message = Column(String(500), nullable=True)  # Now optional (can be image-only)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    background_color = Column(String(20), default="#008080")
    text_color = Column(String(20), default="#FFFFFF")
    # New formatting fields
    text_align = Column(String(10), default="center")  # left, center, right
    font_weight = Column(String(10), default="normal")  # normal, bold
    image_url = Column(LONGTEXT, nullable=True)  # Optional image (supports base64)
    mobile_image_url = Column(LONGTEXT, nullable=True)  # Optional mobile image (supports base64)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# Import ZaloToken from separate file
from app.models.zalo_tokens import ZaloToken
