// Edge Function: payos-create-link
// Replaces FastAPI `POST /payments/payos/create-link` (app/routers/payments.py).
//
// Called by the checkout page right after create-order. Two shapes:
//
//   { payos_order_code }  — the current flow. create-order parked the priced
//     basket in `pending_orders` without touching `orders`; we build the payment
//     link from that row, and payos-webhook creates the real order on payment.
//
//   { order_id }  — an order that already exists and is still unpaid: orders
//     placed before the deferred flow shipped, or an admin re-issuing a link.
//
// Idempotent in both shapes: an already-issued checkout URL is returned as-is.
//
// Access control: the owner of the checkout (or an admin); guest checkouts have
// no owner and are reachable by whoever holds the code, same as the link itself.
// Secrets: PAYOS_* (+ SUPABASE_* injected automatically).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { createPaymentLink, payosConfigured } from "../_shared/payos.ts";

type Client = ReturnType<typeof serviceClient>;

/** The signed-in caller, as { appUserId, isAdmin } — nulls for an anonymous request. */
async function resolveCaller(req: Request, supabase: Client) {
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return { authId: null, appUserId: null, isAdmin: false };
  const { data: caller } = await supabase
    .from("users").select("user_id, role:roles(role_name)")
    .eq("auth_id", user.id).maybeSingle();
  return {
    authId: user.id,
    appUserId: (caller?.user_id as number | undefined) ?? null,
    isAdmin: caller?.role?.role_name === "Admin",
  };
}

// Grand total = merchandise total + shipping_fee, unless any line item is free-ship.
async function grandTotalForOrder(supabase: Client, order: Record<string, unknown>): Promise<number> {
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

// ── Pending checkout (no order row yet) ────────────────────────────────────
async function linkForPendingOrder(req: Request, supabase: Client, code: number): Promise<Response> {
  const { data: pending, error: pendingErr } = await supabase
    .from("pending_orders").select("*").eq("payos_order_code", code).maybeSingle();
  if (pendingErr) {
    // Never let a database problem masquerade as "no such checkout".
    console.error("pending_orders lookup failed for", code, pendingErr);
    return json(req, { detail: "Không đọc được thông tin thanh toán" }, 500);
  }
  if (!pending) return json(req, { detail: "Checkout not found" }, 404);

  if (pending.order_id) {
    return json(req, { detail: "Đơn hàng này đã được thanh toán" }, 400);
  }

  // A checkout started while signed in stays with that account; a guest
  // checkout has no owner to check against.
  if (pending.auth_id) {
    const caller = await resolveCaller(req, supabase);
    if (!caller.authId) return json(req, { detail: "Not authenticated" }, 401);
    if (!caller.isAdmin && caller.authId !== pending.auth_id) {
      return json(req, { detail: "Access denied" }, 403);
    }
  }

  if (pending.payos_checkout_url) {
    return json(req, {
      pending: true,
      payos_order_code: code,
      checkout_url: pending.payos_checkout_url,
      payment_link_id: pending.payos_payment_link_id,
      amount: Number(pending.amount ?? 0),
    });
  }

  const amount = Number(pending.amount ?? 0);
  if (amount <= 0) return json(req, { detail: "Invalid order amount" }, 400);

  const body = (pending.payload as { body?: Record<string, unknown> })?.body ?? {};
  let buyerEmail = (pending.guest_email as string | null) ?? (body.guest_email as string | null) ?? null;
  if (!buyerEmail && pending.auth_id) {
    const { data: u } = await supabase
      .from("users").select("email").eq("auth_id", pending.auth_id).maybeSingle();
    buyerEmail = u?.email ?? null;
  }

  const data = await createPaymentLink({
    orderCode: code,
    amount,
    description: `DH ${code}`,
    buyerName: (body.shipping_full_name as string | null) ?? null,
    buyerEmail,
    buyerPhone: (body.shipping_phone_number as string | null) ?? null,
  });

  if (!data || !data.checkoutUrl) {
    console.error("PayOS link creation failed for pending checkout", code, data);
    return json(req, { detail: "Không thể tạo link thanh toán PayOS" }, 502);
  }

  await supabase.from("pending_orders").update({
    payos_payment_link_id: data.paymentLinkId ?? null,
    payos_checkout_url: data.checkoutUrl,
  }).eq("payos_order_code", code);

  return json(req, {
    pending: true,
    payos_order_code: code,
    checkout_url: data.checkoutUrl,
    payment_link_id: data.paymentLinkId ?? null,
    qr_code: data.qrCode ?? null,
    amount,
  });
}

// ── Existing unpaid order ──────────────────────────────────────────────────
async function linkForExistingOrder(req: Request, supabase: Client, orderId: number): Promise<Response> {
  const { data: order } = await supabase
    .from("orders").select("*").eq("order_id", orderId).maybeSingle();
  if (!order) return json(req, { detail: "Order not found" }, 404);

  if (order.user_id != null) {
    const caller = await resolveCaller(req, supabase);
    if (!caller.authId) return json(req, { detail: "Not authenticated" }, 401);
    if (!caller.isAdmin && caller.appUserId !== order.user_id) {
      return json(req, { detail: "Access denied" }, 403);
    }
  }

  if (String(order.payment_method ?? "").toLowerCase() !== "payos") {
    return json(req, { detail: "Order is not a PayOS order" }, 400);
  }
  if (String(order.payment_status ?? "").toLowerCase() === "paid") {
    return json(req, { detail: "Order is already paid" }, 400);
  }

  if (order.payos_checkout_url && order.payos_order_code) {
    return json(req, {
      order_id: order.order_id,
      payos_order_code: order.payos_order_code,
      checkout_url: order.payos_checkout_url,
      payment_link_id: order.payos_payment_link_id,
      amount: await grandTotalForOrder(supabase, order),
    });
  }

  const amount = await grandTotalForOrder(supabase, order);
  if (amount <= 0) return json(req, { detail: "Invalid order amount" }, 400);

  // These orders predate `payos_order_code_seq`, so they keep using order_id as
  // their code — the sequence starts high enough that the two never collide.
  const payosOrderCode = Number(order.order_id);

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
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  if (!payosConfigured()) {
    return json(req, { detail: "PayOS chưa được cấu hình" }, 503);
  }

  let body: { payos_order_code?: number; order_id?: number };
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }

  const supabase = serviceClient();

  if (body.payos_order_code) {
    return await linkForPendingOrder(req, supabase, Number(body.payos_order_code));
  }
  if (body.order_id) {
    return await linkForExistingOrder(req, supabase, Number(body.order_id));
  }
  return json(req, { detail: "payos_order_code or order_id required" }, 400);
});
