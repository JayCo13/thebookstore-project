// Edge Function: payos-create-link
// Replaces FastAPI `POST /payments/payos/create-link` (app/routers/payments.py).
//
// Called by the checkout page right after create-order (payment_method=payos).
// Computes the grand total (merchandise + shipping, unless a free-ship item
// zeroes shipping), creates a PayOS checkout link, persists
// payos_order_code/payment_link_id/checkout_url, returns the checkout URL.
// Idempotent: returns the stored URL if one already exists.
//
// Access control: order owner, an admin, or a guest order (user_id is null).
// Secrets: PAYOS_* (+ SUPABASE_* injected automatically).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { createPaymentLink, payosConfigured } from "../_shared/payos.ts";

// Grand total = merchandise total + shipping_fee, unless any line item is free-ship.
async function grandTotal(
  supabase: ReturnType<typeof serviceClient>,
  order: Record<string, unknown>,
): Promise<number> {
  const { data: items } = await supabase
    .from("order_items")
    .select("book:books(is_free_ship), stationery:stationery(is_free_ship)")
    .eq("order_id", order.order_id);
  const hasFreeShip = (items ?? []).some(
    (it) => it.book?.is_free_ship || it.stationery?.is_free_ship,
  );
  let total = Number(order.total_amount ?? 0);
  if (!hasFreeShip) total += Number(order.shipping_fee ?? 0);
  return total;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  if (!payosConfigured()) {
    return json(req, { detail: "PayOS chưa được cấu hình" }, 503);
  }

  let body: { order_id?: number };
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }
  if (!body.order_id) return json(req, { detail: "order_id required" }, 400);

  const supabase = serviceClient();
  const { data: order } = await supabase
    .from("orders").select("*").eq("order_id", body.order_id).maybeSingle();
  if (!order) return json(req, { detail: "Order not found" }, 404);

  // ── Access control ──
  if (order.user_id != null) {
    const { data: { user } } = await userClient(req).auth.getUser();
    if (!user) return json(req, { detail: "Not authenticated" }, 401);
    const { data: caller } = await supabase
      .from("users")
      .select("user_id, role:roles(role_name)")
      .eq("auth_id", user.id).maybeSingle();
    const isAdmin = caller?.role?.role_name === "Admin";
    if (!isAdmin && caller?.user_id !== order.user_id) {
      return json(req, { detail: "Access denied" }, 403);
    }
  }

  if (String(order.payment_method ?? "").toLowerCase() !== "payos") {
    return json(req, { detail: "Order is not a PayOS order" }, 400);
  }
  if (String(order.payment_status ?? "").toLowerCase() === "paid") {
    return json(req, { detail: "Order is already paid" }, 400);
  }

  // ── Idempotent: reuse existing link ──
  if (order.payos_checkout_url && order.payos_order_code) {
    return json(req, {
      order_id: order.order_id,
      payos_order_code: order.payos_order_code,
      checkout_url: order.payos_checkout_url,
      payment_link_id: order.payos_payment_link_id,
      amount: await grandTotal(supabase, order),
    });
  }

  const amount = await grandTotal(supabase, order);
  if (amount <= 0) return json(req, { detail: "Invalid order amount" }, 400);

  // PayOS needs a unique integer orderCode; the local order_id works (never reused).
  const payosOrderCode = Number(order.order_id);

  // Buyer email: registered user's email or guest_email.
  let buyerEmail = (order.guest_email as string | null) ?? null;
  if (!buyerEmail && order.user_id) {
    const { data: u } = await supabase
      .from("users").select("email").eq("user_id", order.user_id).maybeSingle();
    buyerEmail = u?.email ?? null;
  }

  const data = await createPaymentLink({
    orderCode: payosOrderCode,
    amount,
    description: `DH ${order.order_id}`,
    buyerName: order.shipping_full_name as string | null,
    buyerEmail,
    buyerPhone: order.shipping_phone_number as string | null,
  });

  if (!data || !data.checkoutUrl) {
    console.error("PayOS link creation failed for order", order.order_id, data);
    return json(req, { detail: "Không thể tạo link thanh toán PayOS" }, 502);
  }

  await supabase.from("orders").update({
    payos_order_code: payosOrderCode,
    payos_payment_link_id: data.paymentLinkId ?? null,
    payos_checkout_url: data.checkoutUrl,
  }).eq("order_id", order.order_id);

  return json(req, {
    order_id: order.order_id,
    payos_order_code: payosOrderCode,
    checkout_url: data.checkoutUrl,
    payment_link_id: data.paymentLinkId ?? null,
    qr_code: data.qrCode ?? null,
    amount,
  });
});
