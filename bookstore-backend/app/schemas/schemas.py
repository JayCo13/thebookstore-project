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


# Author schemas
class AuthorBase(BaseModel):
    name: str


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
    isbn: Optional[str] = None
    description: Optional[str] = None
    price: Decimal
    stock_quantity: int
    publication_date: Optional[date] = None


class BookCreate(BookBase):
    author_ids: List[int] = []
    category_ids: List[int] = []


class BookUpdate(BaseModel):
    title: Optional[str] = None
    isbn: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    publication_date: Optional[date] = None
    author_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None


class Book(BookBase):
    book_id: int
    image_url: Optional[str] = None
    created_at: datetime
    authors: List[Author] = []
    categories: List[Category] = []
    
    class Config:
        from_attributes = True


# BookResponse is an alias for Book for API responses
class BookResponse(Book):
    pass


class BookList(BaseModel):
    books: List[Book]
    total: int
    page: int
    per_page: int
    total_pages: int


# Order schemas
class OrderItemBase(BaseModel):
    book_id: int
    quantity: int


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    order_item_id: int
    price_at_purchase: Decimal
    book: Book
    
    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    status: str = "Pending"


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
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


class Order(OrderBase):
    order_id: int
    user_id: int
    order_date: datetime
    total_amount: Decimal
    order_items: List[OrderItem] = []
    
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


# Response schemas
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str