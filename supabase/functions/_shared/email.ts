// Email notifications — replaces the Zalo ZNS path entirely (more stable: no
// OAuth tokens to refresh/expire). Ported from app/services/email_service.py
// (send_order_confirmation_email + send_new_order_admin_notification).
//
// Sent via the Resend HTTP API. (Raw SMTP/denomailer does NOT work on Supabase
// Edge Functions — the outbound TCP connection to Gmail hangs.) Resend has a
// free tier: https://resend.com.
// Secrets: RESEND_API_KEY, MAIL_FROM (a sender on your verified Resend domain,
//          e.g. "no-reply@tamnguon.com"), MAIL_FROM_NAME, ADMIN_EMAIL.

function vnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN").replace(/,/g, ".")} đ`;
}

function isConfigured(): boolean {
  return Boolean(Deno.env.get("RESEND_API_KEY"));
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set; skipping email");
    return false;
  }
  if (!to) {
    console.warn("No recipient; skipping email");
    return false;
  }
  const fromName = Deno.env.get("MAIL_FROM_NAME") ?? "Book Tâm Nguồn";
  // Must be an address on a domain verified in Resend. onboarding@resend.dev
  // works out-of-the-box but only delivers to your own Resend account email.
  const fromAddr = Deno.env.get("MAIL_FROM") ?? "onboarding@resend.dev";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: `${fromName} <${fromAddr}>`, to: [to], subject, html }),
    });
    if (!resp.ok) {
      console.error("Resend send failed", resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend send error", e);
    return false;
  }
}

interface OrderEmailData {
  orderId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  totalAmount: number;
  shippingFee: number;
  paymentLabel: string;
  ghnCode: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

function paymentLabel(order: Record<string, unknown>): string {
  const pm = String(order.payment_method ?? "").toLowerCase();
  const paid = String(order.payment_status ?? "").toLowerCase() === "paid";
  if (pm === "payos") return paid ? "Đã thanh toán PayOS" : "Chờ thanh toán PayOS";
  if (pm === "cod") return "Thanh toán khi nhận hàng (COD)";
  return String(order.payment_method ?? "Không xác định");
}

// Customer-facing order confirmation (the notification Zalo used to send).
export async function sendOrderConfirmationEmail(d: OrderEmailData): Promise<boolean> {
  if (!d.customerEmail) {
    console.warn(`Order ${d.orderId} has no customer email; skipping confirmation`);
    return false;
  }
  const itemsRows = d.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e0e0e0;">${i.name}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:center;">${i.quantity}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #e0e0e0;text-align:right;">${vnd(i.price)}</td></tr>`,
    )
    .join("");
  const grandTotal = d.totalAmount + d.shippingFee;
  const html = `<!DOCTYPE html><html lang="vi"><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);">
  <tr><td style="background:#008080;padding:30px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:#fff;margin:0;font-size:28px;">Book Tâm Nguồn</h1></td></tr>
  <tr><td style="padding:40px 30px;">
    <h2 style="color:#008080;margin:0 0 20px;">✅ Xác Nhận Đơn Hàng #${d.orderId}</h2>
    <p style="color:#333;line-height:1.8;">Kính gửi <strong>${d.customerName}</strong>,</p>
    <p style="color:#333;line-height:1.8;">Cảm ơn bạn đã đặt hàng! Chúng tôi đã nhận được đơn hàng của bạn và đang xử lý.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin:20px 0;">
      <tr style="background:#f5f5f5;"><td style="padding:10px;font-weight:bold;">Sản phẩm</td><td style="padding:10px;font-weight:bold;text-align:center;">SL</td><td style="padding:10px;font-weight:bold;text-align:right;">Giá</td></tr>
      ${itemsRows}
    </table>
    <div style="background:#f0f8ff;border-left:4px solid #008080;padding:20px;border-radius:4px;">
      <p style="margin:6px 0;color:#555;">Tiền hàng: <strong>${vnd(d.totalAmount)}</strong></p>
      <p style="margin:6px 0;color:#555;">Phí vận chuyển: <strong>${vnd(d.shippingFee)}</strong></p>
      <p style="margin:6px 0;color:#008080;font-size:18px;">Tổng cộng: <strong>${vnd(grandTotal)}</strong></p>
      <p style="margin:6px 0;color:#555;">Phương thức: <strong>${d.paymentLabel}</strong></p>
      ${d.ghnCode ? `<p style="margin:6px 0;color:#555;">Mã vận đơn GHN: <strong>${d.ghnCode}</strong></p>` : ""}
    </div>
    <p style="color:#333;line-height:1.8;margin-top:25px;">Giao đến: ${d.address}</p>
    <p style="color:#333;line-height:1.8;margin-top:25px;">Cảm ơn bạn đã mua sắm tại Book Tâm Nguồn!</p>
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:20px 30px;text-align:center;border-radius:0 0 8px 8px;">
    <p style="color:#6c757d;font-size:14px;margin:0;">Trân trọng,<br><strong style="color:#008080;">Đội ngũ Book Tâm Nguồn</strong></p>
  </td></tr>
</table></td></tr></table></body></html>`;
  return await send(d.customerEmail, `Xác Nhận Đơn Hàng #${d.orderId} - Book Tâm Nguồn`, html);
}

// Admin-facing new-order notification.
export async function sendNewOrderAdminEmail(d: OrderEmailData): Promise<boolean> {
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set; skipping admin notification");
    return false;
  }
  const itemsRows = d.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e0e0e0;">${i.name}</td>` +
        `<td style="padding:8px;text-align:center;border-bottom:1px solid #e0e0e0;">${i.quantity}</td>` +
        `<td style="padding:8px;text-align:right;border-bottom:1px solid #e0e0e0;">${vnd(i.price)}</td></tr>`,
    )
    .join("");
  const grandTotal = d.totalAmount + d.shippingFee;
  const html = `<!DOCTYPE html><html lang="vi"><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);">
  <tr><td style="background:#e65100;padding:25px;text-align:center;border-radius:8px 8px 0 0;"><h1 style="color:#fff;margin:0;font-size:24px;">🛒 ĐƠN HÀNG MỚI #${d.orderId}</h1></td></tr>
  <tr><td style="padding:25px 30px;">
    <h3 style="color:#333;border-bottom:2px solid #008080;padding-bottom:8px;">👤 KHÁCH HÀNG</h3>
    <p><strong>Tên:</strong> ${d.customerName}</p>
    <p><strong>Điện thoại:</strong> ${d.customerPhone}</p>
    <p><strong>Email:</strong> ${d.customerEmail || "Không có"}</p>
    <p><strong>Địa chỉ:</strong> ${d.address}</p>
    <h3 style="color:#333;border-bottom:2px solid #008080;padding-bottom:8px;">📦 SẢN PHẨM</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;">
      <tr style="background:#f5f5f5;"><td style="padding:8px;font-weight:bold;">Sản phẩm</td><td style="padding:8px;font-weight:bold;text-align:center;">SL</td><td style="padding:8px;font-weight:bold;text-align:right;">Giá</td></tr>
      ${itemsRows}
    </table>
    <div style="background:#e8f5e9;border-radius:8px;padding:20px;margin-top:20px;">
      <p>Tiền hàng: <strong>${vnd(d.totalAmount)}</strong></p>
      <p>Phí vận chuyển: <strong>${vnd(d.shippingFee)}</strong></p>
      <p style="font-size:18px;color:#2e7d32;">Tổng cộng: <strong>${vnd(grandTotal)}</strong></p>
      <p>Phương thức: <strong style="color:#e65100;">${d.paymentLabel}</strong></p>
      <p>Mã vận đơn GHN: <strong>${d.ghnCode || "Chưa có"}</strong></p>
    </div>
  </td></tr>
</table></td></tr></table></body></html>`;
  return await send(adminEmail, `🛒 Đơn hàng mới #${d.orderId} - ${d.customerName}`, html);
}

// Weekly admin login code email (ported from send_admin_login_code_email).
export async function sendAdminCodeEmail(code: string, expiresAt: Date): Promise<boolean> {
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set; cannot email admin login code");
    return false;
  }
  const expiry = expiresAt.toLocaleString("vi-VN");
  const html = `<!DOCTYPE html><html lang="vi"><body style="font-family:Arial,sans-serif;color:#333;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#008080;border-bottom:2px solid #008080;padding-bottom:10px;">🔐 Mã Đăng Nhập Quản Trị Hàng Tuần</h2>
  <p>Mã đăng nhập quản trị mới của bạn:</p>
  <div style="background:#f0f8ff;border-left:4px solid #008080;padding:20px;margin:20px 0;text-align:center;">
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#008080;font-family:monospace;">${code}</div>
  </div>
  <p><strong>Có hiệu lực đến:</strong> ${expiry}</p>
  <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:5px;padding:15px;margin:20px 0;">
    <ul style="margin:0;"><li>Không chia sẻ mã với bất kỳ ai</li><li>Mã mới tự động mỗi tuần</li><li>Hết hạn sau 7 ngày</li><li>Cần cả mật khẩu VÀ mã này để đăng nhập</li></ul>
  </div>
  <p style="color:#6c757d;font-size:12px;">Đội Ngũ Bảo Mật Book Tâm Nguồn — email tự động, vui lòng không trả lời.</p>
</div></body></html>`;
  return await send(adminEmail, "🔐 Mã Đăng Nhập Quản Trị Hàng Tuần - Book Tâm Nguồn", html);
}

export { paymentLabel };
