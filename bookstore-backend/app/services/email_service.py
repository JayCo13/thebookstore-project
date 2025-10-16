from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import settings
from typing import List
import logging

logger = logging.getLogger(__name__)

# Email configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_FROM_NAME=settings.mail_from_name,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=False  # Disable certificate validation for Gmail
)

fastmail = FastMail(conf)


async def send_email(
    recipients: List[str],
    subject: str,
    body: str,
    html_body: str = None
):
    """Send an email."""
    try:
        message = MessageSchema(
            subject=subject,
            recipients=recipients,
            body=body,
            html=html_body,
            subtype=MessageType.html if html_body else MessageType.plain
        )
        
        await fastmail.send_message(message)
        logger.info(f"Email sent successfully to {recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


async def send_welcome_email(email: str, first_name: str, verification_token: str = None):
    """Send welcome email to new user with email verification link."""
    subject = "Welcome to TheBookstore - Please Verify Your Email"
    
    if verification_token:
        verification_url = f"http://localhost:3000/verify-email?token={verification_token}"
        
        body = f"""
        Dear {first_name},
        
        Welcome to our TheBookstore! Your account has been successfully created.
        
        To complete your registration and start using your account, please verify your email address by clicking the link below:
        {verification_url}
        
        Once verified, you can:
        - Browse our extensive collection of books
        - Add books to your wishlist
        - Place orders
        - Track your order history
        
        This verification link will expire in 24 hours for security reasons.
        
        Thank you for joining us!
        
        Best regards,
        The Bookstore Team
        """
        
        html_body = f"""
        <html>
            <body>
                <h2>Welcome to TheBookstore!</h2>
                <p>Dear {first_name},</p>
                
                <p>Welcome to our TheBookstore! Your account has been successfully created.</p>
                
                <p>To complete your registration and start using your account, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Verify Email Address</a>
                </div>
                
                <p>Once verified, you can:</p>
                <ul>
                    <li>Browse our extensive collection of books</li>
                    <li>Add books to your wishlist</li>
                    <li>Place orders</li>
                    <li>Track your order history</li>
                </ul>
                
                <p><small>This verification link will expire in 24 hours for security reasons.</small></p>
                
                <p>Thank you for joining us!</p>
                
                <p>Best regards,<br>
                The Bookstore Team</p>
            </body>
        </html>
        """
    else:
        # Fallback for users without verification token (existing users)
        body = f"""
        Dear {first_name},
        
        Welcome to our TheBookstore! Your account has been successfully created.
        
        You can now:
        - Browse our extensive collection of books
        - Add books to your wishlist
        - Place orders
        - Track your order history
        
        Thank you for joining us!
        
        Best regards,
        The Bookstore Team
        """
        
        html_body = f"""
        <html>
            <body>
                <h2>Welcome to TheBookstore!</h2>
                <p>Dear {first_name},</p>
                
                <p>Welcome to our TheBookstore! Your account has been successfully created.</p>
                
                <p>You can now:</p>
                <ul>
                    <li>Browse our extensive collection of books</li>
                    <li>Add books to your wishlist</li>
                    <li>Place orders</li>
                    <li>Track your order history</li>
                </ul>
                
                <p>Thank you for joining us!</p>
                
                <p>Best regards,<br>
                The Bookstore Team</p>
            </body>
        </html>
        """
    
    return await send_email([email], subject, body, html_body)


async def send_password_reset_email(email: str, first_name: str, reset_token: str):
    """Send password reset email."""
    subject = "Password Reset Request"
    
    # In a real application, this would be your frontend URL
    reset_url = f"http://localhost:3000/reset-password?token={reset_token}"
    
    body = f"""
    Dear {first_name},
    
    You have requested to reset your password for your Bookstore account.
    
    Please click the following link to reset your password:
    {reset_url}
    
    This link will expire in 1 hour for security reasons.
    
    If you did not request this password reset, please ignore this email.
    
    Best regards,
    The Bookstore Team
    """
    
    html_body = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Dear {first_name},</p>
            
            <p>You have requested to reset your password for your Bookstore account.</p>
            
            <p>Please click the following link to reset your password:</p>
            <p><a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            
            <p>This link will expire in 1 hour for security reasons.</p>
            
            <p>If you did not request this password reset, please ignore this email.</p>
            
            <p>Best regards,<br>
            The Bookstore Team</p>
        </body>
    </html>
    """
    
    return await send_email([email], subject, body, html_body)


async def send_order_confirmation_email(email: str, first_name: str, order_id: int, total_amount: float):
    """Send order confirmation email."""
    subject = f"Order Confirmation - Order #{order_id}"
    
    body = f"""
    Dear {first_name},
    
    Thank you for your order! We have received your order and it is being processed.
    
    Order Details:
    - Order ID: #{order_id}
    - Total Amount: ${total_amount:.2f}
    
    You will receive another email when your order ships.
    
    Thank you for shopping with us!
    
    Best regards,
    The Bookstore Team
    """
    
    html_body = f"""
    <html>
        <body>
            <h2>Order Confirmation</h2>
            <p>Dear {first_name},</p>
            
            <p>Thank you for your order! We have received your order and it is being processed.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Details:</h3>
                <p><strong>Order ID:</strong> #{order_id}</p>
                <p><strong>Total Amount:</strong> ${total_amount:.2f}</p>
            </div>
            
            <p>You will receive another email when your order ships.</p>
            
            <p>Thank you for shopping with us!</p>
            
            <p>Best regards,<br>
            The Bookstore Team</p>
        </body>
    </html>
    """
    
    return await send_email([email], subject, body, html_body)