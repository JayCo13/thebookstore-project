from __future__ import annotations
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


# Base schemas
class RoleBase(BaseModel):
    role_name: str


class RoleCreate(RoleBase):
    pass


class Role(RoleBase):
    role_id: int
    
    class Config:
        from_attributes = True


# User schemas
class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AdminLoginRequest(BaseModel):
    """Admin login request with weekly rotating code."""
    email: EmailStr
    password: str
    login_code: str
    
    @validator('login_code')
    def validate_login_code(cls, v):
        if not v or len(v) != 6:
            raise ValueError('Login code must be 6 digits')
        if not v.isdigit():
            raise ValueError('Login code must contain only numbers')
        return v



class UserResponse(UserBase):
    user_id: int
    role: Role
    created_at: datetime
    is_active: int
    google_id: Optional[str] = None
    profile_picture: Optional[str] = None
    auth_provider: str = "local"
    phone_number: Optional[str] = None
    addresses: List['AddressResponse'] = []
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    default_address_id: Optional[int] = None


class GuestAccountCreate(BaseModel):
    """Schema for creating an account from guest checkout."""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    order_id: Optional[int] = None  # Optional - can create account before order
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


class PhoneNumberUpdate(BaseModel):
    """Schema for updating user's phone number."""
    phone_number: str



# Address schemas
class AddressBase(BaseModel):
    phone_number: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    postal_code: str
    country: str
    is_default_shipping: bool = False


class AddressCreate(AddressBase):
    pass


class AddressUpdate(BaseModel):
    phone_number: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_default_shipping: Optional[bool] = None


class AddressResponse(AddressBase):
    address_id: int
    user_id: int
    
    class Config:
        from_attributes = True


class AddressListResponse(BaseModel):
    addresses: List[AddressResponse]
    default_address_id: Optional[int] = None


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v


# Google OAuth schemas
class GoogleAuthURL(BaseModel):
    authorization_url: str


class GoogleAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None


class GoogleUserInfo(BaseModel):
    google_id: str
    email: str
    first_name: str
    last_name: str
    profile_picture: Optional[str] = None
    email_verified: bool = False


# Chatbot schemas
class ChatRequest(BaseModel):
    message: str
    # Optional session id to keep conversation context across requests
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    # Echo session id so frontend can persist and reuse it
    session_id: Optional[str] = None


# Author schemas
class AuthorBase(BaseModel):
    name: str
    bio: Optional[str] = None


class AuthorCreate(AuthorBase):
    pass


class Author(AuthorBase):
    author_id: int
    
    class Config:
        from_attributes = True


# AuthorResponse is an alias for Author for API responses
class AuthorResponse(Author):
    pass


# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class Category(CategoryBase):
    category_id: int
    
    class Config:
        from_attributes = True


# CategoryResponse is an alias for Category for API responses
class CategoryResponse(Category):
    pass


# Book schemas
class BookBase(BaseModel):
    title: str
    slug: Optional[str] = None
    isbn: Optional[str] = None
    brief_description: Optional[str] = None
    full_description: Optional[str] = None
    price: int
    stock_quantity: int
    publication_date: Optional[date] = None
    read_sample: Optional[str] = None  # JSON string of image file paths
    audio_sample: Optional[str] = None  # Audio file path
    is_active: bool = True
    
    # Position fields
    is_best_seller: bool = False
    is_new: bool = False
    is_discount: bool = False
    is_slide1: bool = False
    is_slide2: bool = False
    is_slide3: bool = False
    is_free_ship: bool = False
    
    # Discount fields
    discount_percentage: Optional[Decimal] = None
    discount_amount: Optional[int] = None
    discounted_price: Optional[int] = None

    # Physical dimensions for shipping (in cm and grams)
    height: Optional[Decimal] = None
    width: Optional[Decimal] = None
    length: Optional[Decimal] = None
    weight: Optional[int] = None


class BookCreate(BookBase):
    author_ids: List[int] = []
    category_ids: List[int] = []


class BookUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    isbn: Optional[str] = None
    brief_description: Optional[str] = None
    full_description: Optional[str] = None
    price: Optional[int] = None
    stock_quantity: Optional[int] = None
    publication_date: Optional[date] = None
    read_sample: Optional[str] = None  # JSON string of image file paths
    audio_sample: Optional[str] = None  # Audio file path
    # Cho phép cập nhật trực tiếp các URL ảnh để hỗ trợ sắp xếp/xóa từ UI
    image_url: Optional[str] = None
    image2_url: Optional[str] = None
    image3_url: Optional[str] = None
    is_active: Optional[bool] = None
    author_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None
    
    # Position fields
    is_best_seller: Optional[bool] = None
    is_new: Optional[bool] = None
    is_discount: Optional[bool] = None
    is_slide1: Optional[bool] = None
    is_slide2: Optional[bool] = None
    is_slide3: Optional[bool] = None
    is_free_ship: Optional[bool] = None
    
    # Discount fields
    discount_percentage: Optional[Decimal] = None
    discount_amount: Optional[int] = None
    discounted_price: Optional[int] = None

    # Physical dimensions for shipping (in cm and grams)
    height: Optional[Decimal] = None
    width: Optional[Decimal] = None
    length: Optional[Decimal] = None
    weight: Optional[int] = None


class Book(BookBase):
    book_id: int
    image_url: Optional[str] = None
    image2_url: Optional[str] = None
    image3_url: Optional[str] = None
    read_sample: Optional[str] = None  # JSON string of image file paths
    audio_sample: Optional[str] = None  # Audio file path
    created_at: datetime
    authors: List[Author] = []
    categories: List[Category] = []
    
    class Config:
        from_attributes = True


# BookResponse is an alias for Book for API responses
class BookResponse(Book):
    total_sold: Optional[int] = 0  # Total quantity sold from orders


class BookList(BaseModel):
    books: List[Book]
    total: int
    page: int
    per_page: int
    total_pages: int

# Stationery schemas
class StationeryBase(BaseModel):
    title: str
    slug: Optional[str] = None
    brief_description: Optional[str] = None
    full_description: Optional[str] = None
    sku: Optional[str] = None
    price: int
    stock_quantity: int = 0
    image_url: Optional[str] = None
    image2_url: Optional[str] = None
    image3_url: Optional[str] = None
    is_active: bool = True

    # Physical info
    height_cm: Optional[Decimal] = None
    width_cm: Optional[Decimal] = None
    length_cm: Optional[Decimal] = None
    weight_grams: Optional[int] = None

    # Position flags
    is_best_seller: bool = False
    is_new: bool = False
    is_discount: bool = False
    is_slide1: bool = False
    is_slide2: bool = False
    is_slide3: bool = False
    is_free_ship: bool = False

    # Discount fields
    discount_percentage: Optional[Decimal] = None
    discount_amount: Optional[int] = None
    discounted_price: Optional[int] = None


class StationeryCreate(StationeryBase):
    category_ids: List[int] = []


class StationeryUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    brief_description: Optional[str] = None
    full_description: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[int] = None
    stock_quantity: Optional[int] = None
    image_url: Optional[str] = None
    image2_url: Optional[str] = None
    image3_url: Optional[str] = None
    is_active: Optional[bool] = None

    # Physical info
    height_cm: Optional[Decimal] = None
    width_cm: Optional[Decimal] = None
    length_cm: Optional[Decimal] = None
    weight_grams: Optional[int] = None

    # Position flags
    is_best_seller: Optional[bool] = None
    is_new: Optional[bool] = None
    is_discount: Optional[bool] = None
    is_slide1: Optional[bool] = None
    is_slide2: Optional[bool] = None
    is_slide3: Optional[bool] = None
    is_free_ship: Optional[bool] = None

    # Discount fields
    discount_percentage: Optional[Decimal] = None
    discount_amount: Optional[int] = None
    discounted_price: Optional[int] = None

    # Relations
    category_ids: Optional[List[int]] = None


class StationeryResponse(StationeryBase):
    stationery_id: int
    created_at: datetime
    categories: List[Category] = []
    total_sold: Optional[int] = 0  # Total quantity sold from orders

    class Config:
        from_attributes = True


class StationeryList(BaseModel):
    stationery: List[StationeryResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# Order schemas
class OrderItemBase(BaseModel):
    book_id: Optional[int] = None
    stationery_id: Optional[int] = None
    quantity: int


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    order_item_id: int
    price_at_purchase: int
    book: Optional[Book] = None
    stationery: Optional[StationeryResponse] = None
    
    class Config:
        from_attributes = True


# GHN item payload schemas (for non-book items to be sent to GHN)
class GHNItemCreate(BaseModel):
    stationery_id: Optional[int] = None
    name: str
    quantity: int
    price: int
    length: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    weight: Optional[int] = None


class OrderBase(BaseModel):
    status: str = "Pending"


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    # Optional GHN items for non-book products (e.g., stationery)
    ghn_items: Optional[List[GHNItemCreate]] = None
    # For registered users - use saved address or provide new address
    shipping_address_id: Optional[int] = None
    shipping_address: Optional[AddressCreate] = None
    save_address: bool = False
    # For guest users - provide shipping details directly
    guest_email: Optional[str] = None
    shipping_phone_number: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    shipping_country: Optional[str] = None
    
    # GHN Integration Fields
    shipping_method: Optional[str] = None
    payment_method: Optional[str] = None
    cod_amount: Optional[int] = None
    shipping_full_name: Optional[str] = None
    ghn_province_id: Optional[int] = None
    ghn_district_id: Optional[int] = None
    ghn_ward_code: Optional[str] = None
    ghn_province_name: Optional[str] = None
    ghn_district_name: Optional[str] = None
    ghn_ward_name: Optional[str] = None
    shipping_service_id: Optional[int] = None
    shipping_fee: Optional[int] = None
    package_weight: Optional[int] = None
    package_length: Optional[int] = None
    package_width: Optional[int] = None
    package_height: Optional[int] = None


class Order(OrderBase):
    order_id: int
    user_id: Optional[int] = None
    order_date: datetime
    total_amount: int
    order_items: List[OrderItem] = []
    
    # Guest order fields
    guest_email: Optional[str] = None
    shipping_phone_number: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    shipping_country: Optional[str] = None
    
    # GHN Integration Fields
    shipping_method: Optional[str] = None
    payment_method: Optional[str] = None
    cod_amount: Optional[int] = None
    shipping_full_name: Optional[str] = None
    ghn_order_code: Optional[str] = None
    ghn_province_id: Optional[int] = None
    ghn_district_id: Optional[int] = None
    ghn_ward_code: Optional[str] = None
    ghn_province_name: Optional[str] = None
    ghn_district_name: Optional[str] = None
    ghn_ward_name: Optional[str] = None
    shipping_service_id: Optional[int] = None
    shipping_fee: Optional[int] = None
    package_weight: Optional[int] = None
    package_length: Optional[int] = None
    package_width: Optional[int] = None
    package_height: Optional[int] = None
    
    class Config:
        from_attributes = True


# OrderResponse is an alias for Order for API responses
class OrderResponse(Order):
    pass


class OrderUpdate(BaseModel):
    status: Optional[str] = None


# Wishlist schemas
class WishlistAdd(BaseModel):
    book_id: int


class WishlistCreate(WishlistAdd):
    pass


class WishlistItem(BaseModel):
    book: Book
    added_at: datetime
    
    class Config:
        from_attributes = True


# WishlistResponse is an alias for WishlistItem for API responses
class WishlistResponse(WishlistItem):
    pass


# Moderation schemas
class ModerationRequest(BaseModel):
    text: str
    rating: Optional[int] = None
    book_id: Optional[int] = None
    user_id: Optional[int] = None
    language: Optional[str] = None  # e.g., "vi" or "en"


class ModerationResponse(BaseModel):
    approved: bool
    flags: List[str] = []
    severity: Optional[str] = None  # e.g., "low", "medium", "high"
    reason: Optional[str] = None


# Response schemas
class MessageResponse(BaseModel):
    message: str


# GHN shipping status schema
class GHNStatusResponse(BaseModel):
    order_code: Optional[str] = None
    status: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str


# Review schemas
class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

    @validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

    @validator('rating')
    def validate_rating_optional(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v


class ReviewUser(BaseModel):
    user_id: int
    name: str


class ReviewResponse(BaseModel):
    review_id: int
    book_id: int
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    # Convenience fields for UI
    user_name: Optional[str] = None
    user: Optional[ReviewUser] = None
    # NEW: convenience field for book title
    book_title: Optional[str] = None

    class Config:
        from_attributes = True

# Stationery Review schemas
class StationeryReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

    @validator('rating')
    def validate_rating_stationery(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class StationeryReviewCreate(StationeryReviewBase):
    pass


class StationeryReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

    @validator('rating')
    def validate_rating_optional_stationery(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Rating must be between 1 and 5')
        return v


class StationeryReviewUser(BaseModel):
    user_id: int
    name: str


class StationeryReviewResponse(BaseModel):
    review_id: int
    stationery_id: int
    user_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    # Convenience fields for UI
    user_name: Optional[str] = None
    user: Optional[StationeryReviewUser] = None
    stationery_title: Optional[str] = None

    class Config:
        from_attributes = True

# Slide content schemas for homepage hero
class SlideContentBase(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    title_color: Optional[str] = None
    body_color: Optional[str] = None
    primary_button_bg_color: Optional[str] = None
    primary_button_text_color: Optional[str] = None
    secondary_button_bg_color: Optional[str] = None
    secondary_button_text_color: Optional[str] = None
    primary_button_label: Optional[str] = None
    secondary_button_label: Optional[str] = None
    primary_button_url: Optional[str] = None
    secondary_button_url: Optional[str] = None
    selected_item_type: Optional[str] = None  # 'book' or 'stationery'
    selected_item_id: Optional[int] = None
    # Font properties for title and body text
    title_font_size: Optional[str] = None
    body_font_size: Optional[str] = None
    title_font_family: Optional[str] = None
    body_font_family: Optional[str] = None
    # Image dimensions
    image_width: Optional[str] = None
    image_height: Optional[str] = None

class SlideContentCreate(SlideContentBase):
    slide_number: int

class SlideContentUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    title_color: Optional[str] = None
    body_color: Optional[str] = None
    primary_button_bg_color: Optional[str] = None
    primary_button_text_color: Optional[str] = None
    secondary_button_bg_color: Optional[str] = None
    secondary_button_text_color: Optional[str] = None
    primary_button_label: Optional[str] = None
    secondary_button_label: Optional[str] = None
    primary_button_url: Optional[str] = None
    secondary_button_url: Optional[str] = None
    selected_item_type: Optional[str] = None
    selected_item_id: Optional[int] = None
    # Font properties for title and body text
    title_font_size: Optional[str] = None
    body_font_size: Optional[str] = None
    title_font_family: Optional[str] = None
    body_font_family: Optional[str] = None
    # Image dimensions
    image_width: Optional[str] = None
    image_height: Optional[str] = None

class SlideContentResponse(SlideContentBase):
    slide_content_id: int
    slide_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Rebuild models to resolve forward references for Pydantic v2
try:
    UserResponse.model_rebuild()
except Exception:
    pass
try:
    AddressResponse.model_rebuild()
except Exception:
    pass


# Notification schemas for admin-managed banners
class NotificationBase(BaseModel):
    message: Optional[str] = None  # Now optional for image-only notifications
    is_active: bool = True
    background_color: str = "#008080"
    text_color: str = "#FFFFFF"
    text_align: str = "center"  # left, center, right
    font_weight: str = "normal"  # normal, bold
    image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    message: Optional[str] = None
    is_active: Optional[bool] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    text_align: Optional[str] = None
    font_weight: Optional[str] = None
    image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None


class NotificationResponse(NotificationBase):
    notification_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
