from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.config import settings
from typing import List
import logging

def format_vnd_price(amount: int) -> str:
    """Format price in Vietnamese Dong with thousand separators."""
    # Format with thousand separators using dots
    formatted = f"{amount:,}".replace(",", ".")
    return f"{formatted} đ"

logger = logging.getLogger(__name__)

# Email configuration (make optional to avoid startup failures when unset)
conf = None
fastmail = None
try:
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
except Exception as e:
    logger.warning(f"Email disabled: invalid or missing configuration ({e})")


async def send_email(
    recipients: List[str],
    subject: str,
    body: str,
    html_body: str = None
):
    """Send an email."""
    try:
        if fastmail is None:
            logger.info("Email not configured; skipping send")
            return False
        
        # If HTML body is provided, use it as the main body
        if html_body:
            message = MessageSchema(
                subject=subject,
                recipients=recipients,
                body=html_body,  # Use HTML as main body
                subtype=MessageType.html
            )
        else:
            message = MessageSchema(
                subject=subject,
                recipients=recipients,
                body=body,
                subtype=MessageType.plain
            )
        
        await fastmail.send_message(message)
        logger.info(f"Email sent successfully to {recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


async def send_welcome_email(email: str, first_name: str, verification_token: str = None):
    """Send welcome email to new user with email verification link."""
    subject = "Chào mừng đến với Book Tâm Nguồn - Vui lòng xác minh email"
    
    if verification_token:
        verification_url = f"http://localhost:3000/verify-email?token={verification_token}"
        
        body = f"""
Kính gửi {first_name},

Chào mừng bạn đến với Book Tâm Nguồn!

Tài khoản của bạn đã được tạo thành công.

Để hoàn tất đăng ký và bắt đầu sử dụng tài khoản, vui lòng xác minh địa chỉ email của bạn bằng cách nhấp vào liên kết bên dưới:

{verification_url}

Sau khi xác minh, bạn có thể:
• Duyệt bộ sưu tập sách phong phú của chúng tôi
• Thêm sách vào danh sách yêu thích
• Đặt hàng dễ dàng và nhanh chóng
• Theo dõi lịch sử đơn hàng của bạn

Lưu ý: Liên kết xác minh này sẽ hết hạn sau 24 giờ vì lý do bảo mật.

Cảm ơn bạn đã tham gia cùng chúng tôi!

Trân trọng,
Đội ngũ Book Tâm Nguồn
        """
        
        html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác Minh Email - Book Tâm Nguồn</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #008080; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                Book Tâm Nguồn
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #008080; margin: 0 0 20px 0; font-size: 24px;">
                                Chào mừng đến với Book Tâm Nguồn!
                            </h2>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 15px 0; font-size: 16px;">
                                Kính gửi <strong>{first_name}</strong>,
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 15px 0; font-size: 16px;">
                                Tài khoản của bạn đã được tạo thành công.
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
                                Để hoàn tất đăng ký và bắt đầu sử dụng tài khoản, vui lòng xác minh địa chỉ email của bạn bằng cách nhấp vào nút bên dưới:
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{verification_url}" style="background-color: #008080; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block;">
                                            Xác Minh Địa Chỉ Email
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Features List -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid #008080; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                <p style="color: #333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">
                                    Sau khi xác minh, bạn có thể:
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 5px 0;">
                                            <span style="color: #008080; font-size: 18px; margin-right: 10px;">•</span>
                                            <span style="color: #555; font-size: 15px;">Duyệt bộ sưu tập sách phong phú của chúng tôi</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;">
                                            <span style="color: #008080; font-size: 18px; margin-right: 10px;">•</span>
                                            <span style="color: #555; font-size: 15px;">Thêm sách vào danh sách yêu thích</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;">
                                            <span style="color: #008080; font-size: 18px; margin-right: 10px;">•</span>
                                            <span style="color: #555; font-size: 15px;">Đặt hàng dễ dàng và nhanh chóng</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0;">
                                            <span style="color: #008080; font-size: 18px; margin-right: 10px;">•</span>
                                            <span style="color: #555; font-size: 15px;">Theo dõi lịch sử đơn hàng của bạn</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Security Note -->
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                <strong>⏰ Lưu ý:</strong> Liên kết xác minh này sẽ hết hạn sau 24 giờ vì lý do bảo mật.
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 30px 0 0 0; font-size: 16px;">
                                Cảm ơn bạn đã tham gia cùng chúng tôi!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0; line-height: 1.6;">
                                Trân trọng,<br>
                                <strong style="color: #008080;">Đội ngũ Book Tâm Nguồn</strong>
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0; line-height: 1.5;">
                                Đây là email tự động. Vui lòng không trả lời email này.<br>
                                Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua website.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
    else:
        # Fallback for users without verification token (existing users)
        body = f"""
Kính gửi {first_name},

Chào mừng bạn đến với Book Tâm Nguồn!

Tài khoản của bạn đã được tạo thành công.

Bạn có thể:
• Duyệt bộ sưu tập sách phong phú của chúng tôi
• Thêm sách vào danh sách yêu thích
• Đặt hàng dễ dàng và nhanh chóng
• Theo dõi lịch sử đơn hàng của bạn

Cảm ơn bạn đã tham gia cùng chúng tôi!

Trân trọng,
Đội ngũ Book Tâm Nguồn
        """
        
        html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chào Mừng - Book Tâm Nguồn</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                    <tr>
                        <td style="background-color: #008080; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Book Tâm Nguồn</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #008080; margin: 0 0 20px 0;">Chào mừng đến với Book Tâm Nguồn!</h2>
                            <p style="color: #333; line-height: 1.8;">Kính gửi <strong>{first_name}</strong>,</p>
                            <p style="color: #333; line-height: 1.8;">Tài khoản của bạn đã được tạo thành công.</p>
                            <p style="color: #333; line-height: 1.8; margin-top: 20px;">Bạn có thể:</p>
                            <ul style="color: #555; line-height: 2;">
                                <li>Duyệt bộ sưu tập sách phong phú của chúng tôi</li>
                                <li>Thêm sách vào danh sách yêu thích</li>
                                <li>Đặt hàng dễ dàng và nhanh chóng</li>
                                <li>Theo dõi lịch sử đơn hàng của bạn</li>
                            </ul>
                            <p style="color: #333; line-height: 1.8; margin-top: 25px;">Cảm ơn bạn đã tham gia cùng chúng tôi!</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0;">
                                Trân trọng,<br>
                                <strong style="color: #008080;">Đội ngũ Book Tâm Nguồn</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """
    
    return await send_email([email], subject, body, html_body)
async def send_password_reset_email(email: str, first_name: str, reset_token: str):
    """Send password reset email."""
    subject = "Yêu Cầu Đặt Lại Mật Khẩu - Book Tâm Nguồn"
    
    # In a real application, this would be your frontend URL
    reset_url = f"http://localhost:3000/auth/reset-password?token={reset_token}"
    
    body = f"""
Kính gửi {first_name},

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Book Tâm Nguồn của mình.

Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu:
{reset_url}

Liên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.

Nếu bạn không yêu cầu đặt lại mật khẩu này, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Book Tâm Nguồn
    """
    
    html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt Lại Mật Khẩu - Book Tâm Nguồn</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #008080; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                Book Tâm Nguồn
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #008080; margin: 0 0 20px 0; font-size: 24px;">
                                Yêu Cầu Đặt Lại Mật Khẩu
                            </h2>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 15px 0; font-size: 16px;">
                                Kính gửi <strong>{first_name}</strong>,
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 15px 0; font-size: 16px;">
                                Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Book Tâm Nguồn của mình.
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
                                Vui lòng nhấp vào nút bên dưới để đặt lại mật khẩu:
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{reset_url}" style="background-color: #008080; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block;">
                                            Đặt Lại Mật Khẩu
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Note -->
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding: 15px; background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                                <strong>⏰ Lưu ý:</strong> Liên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.
                            </p>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 15px 0 0 0; padding: 15px; background-color: #f8f9fa; border-radius: 4px; border-left: 4px solid #6c757d;">
                                Nếu bạn không yêu cầu đặt lại mật khẩu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0; line-height: 1.6;">
                                Trân trọng,<br>
                                <strong style="color: #008080;">Đội ngũ Book Tâm Nguồn</strong>
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0; line-height: 1.5;">
                                Đây là email tự động. Vui lòng không trả lời email này.<br>
                                Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua website.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    return await send_email([email], subject, body, html_body)


async def send_order_confirmation_email(email: str, first_name: str, order_id: int, total_amount: int):
    """Send order confirmation email."""
    subject = f"Xác Nhận Đơn Hàng #{order_id} - Book Tâm Nguồn"
    formatted_amount = format_vnd_price(total_amount)
    
    body = f"""
Kính gửi {first_name},

Cảm ơn bạn đã đặt hàng! Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý.

Chi Tiết Đơn Hàng:
- Mã đơn hàng: #{order_id}
- Tổng tiền: {formatted_amount}

Bạn sẽ nhận được email khác khi đơn hàng được giao.

Cảm ơn bạn đã mua sắm tại Book Tâm Nguồn!

Trân trọng,
Đội ngũ Book Tâm Nguồn
    """
    
    html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác Nhận Đơn Hàng - Book Tâm Nguồn</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #008080; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                Book Tâm Nguồn
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #008080; margin: 0 0 20px 0; font-size: 24px;">
                                ✅ Xác Nhận Đơn Hàng
                            </h2>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 15px 0; font-size: 16px;">
                                Kính gửi <strong>{first_name}</strong>,
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
                                Cảm ơn bạn đã đặt hàng! Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý.
                            </p>
                            
                            <!-- Order Details Box -->
                            <div style="background-color: #f0f8ff; border-left: 4px solid #008080; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                <h3 style="color: #008080; margin: 0 0 15px 0; font-size: 18px;">Chi Tiết Đơn Hàng</h3>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: #555; font-size: 15px;">
                                            <strong>Mã đơn hàng:</strong>
                                        </td>
                                        <td style="padding: 8px 0; color: #008080; font-size: 15px; font-weight: bold; text-align: right;">
                                            #{order_id}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #555; font-size: 15px; border-top: 1px solid #e0e0e0;">
                                            <strong>Tổng tiền:</strong>
                                        </td>
                                        <td style="padding: 8px 0; color: #008080; font-size: 18px; font-weight: bold; text-align: right; border-top: 1px solid #e0e0e0;">
                                            {formatted_amount}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; padding: 15px; background-color: #e8f5e9; border-radius: 4px; border-left: 4px solid #4caf50;">
                                📦 Bạn sẽ nhận được email thông báo khi đơn hàng được giao cho đơn vị vận chuyển.
                            </p>
                            
                            <p style="color: #333; line-height: 1.8; margin: 30px 0 0 0; font-size: 16px;">
                                Cảm ơn bạn đã mua sắm tại Book Tâm Nguồn!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
                            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0; line-height: 1.6;">
                                Trân trọng,<br>
                                <strong style="color: #008080;">Đội ngũ Book Tâm Nguồn</strong>
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0; line-height: 1.5;">
                                Đây là email tự động. Vui lòng không trả lời email này.<br>
                                Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi qua website.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    return await send_email([email], subject, body, html_body)


async def send_new_order_admin_notification(order):
    """Send notification email to admin when a new order is placed."""
    from datetime import datetime
    
    logger.info(f"Starting admin notification for order #{order.order_id}")
    
    # Get admin email from settings
    admin_email = settings.admin_email
    if not admin_email or admin_email == "admin@bookstore.com":
        logger.warning(f"Admin email not configured or is default ({admin_email}), skipping admin order notification")
        return False
    
    logger.info(f"Sending admin notification to: {admin_email}")
    
    # Format order details
    order_id = order.order_id
    customer_name = order.shipping_full_name or getattr(order, 'customer_name', None) or "Khách hàng"
    customer_phone = order.shipping_phone_number or "Chưa cung cấp"
    customer_email = order.guest_email or "Không có"
    
    # Format address
    address_parts = [
        order.shipping_address_line1,
        getattr(order, 'ghn_ward_name', None),
        getattr(order, 'ghn_district_name', None),
        getattr(order, 'ghn_province_name', None),
    ]
    full_address = ", ".join([p for p in address_parts if p]) or "Chưa cung cấp"
    
    # Format amounts
    total_amount = format_vnd_price(int(order.total_amount or 0))
    shipping_fee = format_vnd_price(int(getattr(order, 'shipping_fee', 0) or 0))
    grand_total = format_vnd_price(int(order.total_amount or 0) + int(getattr(order, 'shipping_fee', 0) or 0))
    
    # Payment method
    payment_methods = {
        'cod': 'Thanh toán khi nhận hàng (COD)',
        'momo': 'Ví MoMo',
        'bank_transfer': 'Chuyển khoản ngân hàng'
    }
    payment_method = payment_methods.get(order.payment_method, order.payment_method or "Không xác định")
    
    # Get order items
    items_html = ""
    items_text = ""
    try:
        for item in order.order_items:
            product_name = None
            quantity = item.quantity or 0
            price = item.price_at_purchase or 0
            
            if hasattr(item, 'book') and item.book:
                product_name = item.book.title
            elif hasattr(item, 'stationery') and item.stationery:
                product_name = item.stationery.title
            
            if product_name:
                items_html += f'''
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">{product_name}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">{quantity}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">{format_vnd_price(price)}</td>
                    </tr>
                '''
                items_text += f"- {product_name} x{quantity} - {format_vnd_price(price)}\n"
    except Exception as e:
        logger.error(f"Error formatting order items: {e}")
        items_html = "<tr><td colspan='3'>Không thể tải chi tiết sản phẩm</td></tr>"
        items_text = "Không thể tải chi tiết sản phẩm"
    
    order_time = datetime.now().strftime("%d/%m/%Y %H:%M")
    ghn_code = getattr(order, 'ghn_order_code', None) or "Chưa có"
    
    subject = f"🛒 Đơn hàng mới #{order_id} - {customer_name}"
    
    body = f"""
ĐƠN HÀNG MỚI - #{order_id}
=====================================

Thời gian: {order_time}

THÔNG TIN KHÁCH HÀNG:
- Tên: {customer_name}
- Điện thoại: {customer_phone}
- Email: {customer_email}
- Địa chỉ: {full_address}

CHI TIẾT SẢN PHẨM:
{items_text}

THANH TOÁN:
- Tiền hàng: {total_amount}
- Phí vận chuyển: {shipping_fee}
- Tổng cộng: {grand_total}
- Phương thức: {payment_method}

MÃ VẬN ĐƠN GHN: {ghn_code}

=====================================
Vui lòng kiểm tra và xử lý đơn hàng.
    """
    
    html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn Hàng Mới #{order_id}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background-color: #e65100; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🛒 ĐƠN HÀNG MỚI</h1>
                            <p style="color: #ffe0b2; margin: 10px 0 0 0; font-size: 16px;">Mã đơn: #{order_id}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 30px; background-color: #fff3e0; text-align: center;">
                            <p style="margin: 0; color: #e65100; font-size: 14px;">⏰ {order_time}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 25px 30px;">
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #008080; padding-bottom: 8px;">👤 THÔNG TIN KHÁCH HÀNG</h3>
                            <p><strong>Tên:</strong> {customer_name}</p>
                            <p><strong>Điện thoại:</strong> <a href="tel:{customer_phone}">{customer_phone}</a></p>
                            <p><strong>Email:</strong> {customer_email}</p>
                            <p><strong>Địa chỉ:</strong> {full_address}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 25px 30px;">
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #008080; padding-bottom: 8px;">📦 CHI TIẾT SẢN PHẨM</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e0e0e0;">
                                <tr style="background-color: #f5f5f5;">
                                    <td style="padding: 10px; font-weight: bold;">Sản phẩm</td>
                                    <td style="padding: 10px; font-weight: bold; text-align: center;">SL</td>
                                    <td style="padding: 10px; font-weight: bold; text-align: right;">Giá</td>
                                </tr>
                                {items_html}
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 25px 30px;">
                            <div style="background-color: #e8f5e9; border-radius: 8px; padding: 20px;">
                                <h3 style="color: #2e7d32; margin: 0 0 15px 0;">💰 THANH TOÁN</h3>
                                <p>Tiền hàng: <strong>{total_amount}</strong></p>
                                <p>Phí vận chuyển: <strong>{shipping_fee}</strong></p>
                                <p style="font-size: 18px; color: #2e7d32;">Tổng cộng: <strong>{grand_total}</strong></p>
                                <p>Phương thức: <strong style="color: #e65100;">{payment_method}</strong></p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 30px 25px 30px;">
                            <div style="background-color: #e3f2fd; border-radius: 8px; padding: 15px; text-align: center;">
                                <p style="margin: 0; color: #1565c0;">🚚 Mã vận đơn GHN: <strong>{ghn_code}</strong></p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #666; font-size: 14px; margin: 0;">Vui lòng xử lý đơn hàng sớm nhất có thể.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """
    
    result = await send_email([admin_email], subject, body, html_body)
    logger.info(f"Admin notification email result: {result}")
    return result


async def send_admin_login_code_email(code: str, expires_at):
    """Send weekly admin login code email to admin."""
    from datetime import datetime
    
    subject = "🔐 Mã Đăng Nhập Quản Trị Hàng Tuần - Book Tâm Nguồn"
    
    # Format expiration date
    expiry_str = expires_at.strftime("%d/%m/%Y lúc %H:%M")
    
    body = f"""
    Mã Đăng Nhập Quản Trị Hàng Tuần
    
    Mã: {code}
    
    Mã này được yêu cầu để đăng nhập quản trị và có hiệu lực đến {expiry_str}.
    
    Lưu ý Bảo Mật:
    - Giữ mã này an toàn và không chia sẻ với bất kỳ ai
    - Bạn sẽ nhận được mã mới tự động mỗi tuần
    - Mã này hết hạn sau 7 ngày
    
    Nếu bạn không mong đợi email này, vui lòng liên hệ quản trị viên hệ thống ngay lập tức.
    
    Trân trọng,
    Đội Ngũ Bảo Mật Book Tâm Nguồn
    """
    
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #008080; border-bottom: 2px solid #008080; padding-bottom: 10px;">
                    🔐 Mã Đăng Nhập Quản Trị Hàng Tuần
                </h2>
                
                <p>Mã đăng nhập quản trị mới của bạn đã được tạo:</p>
                
                <div style="background-color: #f0f8ff; border-left: 4px solid #008080; padding: 20px; margin: 20px 0; text-align: center;">
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #008080; font-family: 'Courier New', monospace;">
                        {code}
                    </div>
                </div>
                
                <p><strong>Có Hiệu Lực Đến:</strong> {expiry_str}</p>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #856404;">🔒 Lưu Ý Bảo Mật:</h3>
                    <ul style="margin-bottom: 0;">
                        <li>Giữ mã này an toàn và không chia sẻ với bất kỳ ai</li>
                        <li>Bạn sẽ nhận được mã mới tự động mỗi tuần</li>
                        <li>Mã này hết hạn sau 7 ngày</li>
                        <li>Cần cả mật khẩu VÀ mã này để đăng nhập quản trị</li>
                    </ul>
                </div>
                
                <p style="color: #dc3545; font-weight: bold;">
                    ⚠️ Nếu bạn không mong đợi email này, vui lòng liên hệ quản trị viên hệ thống ngay lập tức.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                
                <p style="color: #6c757d; font-size: 12px;">
                    Trân trọng,<br>
                    Đội Ngũ Bảo Mật Book Tâm Nguồn<br>
                    <em>Đây là email bảo mật tự động. Vui lòng không trả lời.</em>
                </p>
            </div>
        </body>
    </html>
    """
    
    return await send_email([settings.admin_email], subject, body, html_body)