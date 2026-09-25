// Edge Function: create-order
// Replaces FastAPI `POST /orders/` (app/routers/orders.py create_order).
//
// Flow:
//   1. Resolve caller — authenticated user (maps auth.uid() -> app user_id) or guest.
//   2. Price the basket: validate items + stock, compute prices and the total,
//      resolve the shipping address (shared with the PayOS path, _shared/orders.ts).
//   3a. COD  -> insert the order + items, decrement stock, then fulfil INLINE
//       (GoShip booking + order email to customer and admin).
//   3b. PayOS -> insert NOTHING. Park the priced basket in `pending_orders` and
//       return its `payos_order_code`. The frontend turns that into a checkout
//       link, and `payos-webhook` creates the real order once the money lands —
//       so an abandoned payment leaves no dead order and no held stock.
//
// Runs with service_role (bypasses RLS) — orders have no client INSERT policy.
// Secrets: GOSHIP_* + MAIL_* / ADMIN_EMAIL (for the COD inline fulfilment).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { fulfillOrder } from "../_shared/fulfillment.ts";
import { grandTotal, insertOrder, type OrderCreateBody, priceOrder } from "../_shared/orders.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let body: OrderCreateBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return json(req, { detail: "Order must contain at least one item" }, 400);
  }

  const supabase = serviceClient();

  // ── 1. Resolve caller (optional auth) ────────────────────────────────────
  let appUserId: number | null = null;
  let authId: string | null = null;
  try {
    const { data: { user } } = await userClient(req).auth.getUser();
    if (user) {
      authId = user.id;
      const { data: u } = await supabase
        .from("users").select("user_id, email").eq("auth_id", user.id).maybeSingle();
      appUserId = u?.user_id ?? null;
    }
  } catch {
    // No/invalid token → treat as guest (matches get_current_user_optional).
  }

  // ── 2. Price the basket ──────────────────────────────────────────────────
  const priceResult = await priceOrder(supabase, body, appUserId);
  if (!priceResult.ok) {
    return json(req, { detail: priceResult.detail }, priceResult.status);
  }
  const priced = priceResult.priced;

  // ── 3. Create the order, or park it until PayOS confirms payment ─────────
  if ((body.payment_method ?? "").toLowerCase() === "payos") {
    const amount = grandTotal(priced, body.shipping_fee);
    if (amount <= 0) return json(req, { detail: "Invalid order amount" }, 400);

    const { data: pending, error: pendingErr } = await supabase
      .from("pending_orders")
      .insert({
        payload: { body, priced },
        amount,
        auth_id: authId,
        guest_email: appUserId ? null : (body.guest_email ?? null),
      })
      .select("payos_order_code, public_token")
      .single();

    if (pendingErr || !pending) {
      console.error("pending_orders insert failed", pendingErr);
      return json(req, { detail: "Không thể khởi tạo thanh toán" }, 500);
    }

    const payosOrderCode = Number(pending.payos_order_code);
    console.log(`PayOS checkout parked as pending order ${payosOrderCode} (amount ${amount})`);
    // The token is what the customer will use to read their order later; the
    // order itself does not exist yet, so it travels with the parked checkout.
    return json(req, {
      pending: true,
      payos_order_code: payosOrderCode,
      public_token: pending.public_token,
      amount,
    }, 201);
  }

  const inserted = await insertOrder(supabase, body, priced, appUserId);
  if (!inserted.ok) return json(req, { detail: inserted.detail }, inserted.status);
  const orderId = inserted.orderId;

  // COD (and any non-PayOS): book the shipment and send the emails AFTER the
  // response. The customer was waiting on all of it — a GoShip call plus two
  // Resend calls, several seconds of staring at "Đang xử lý..." — for work whose
  // result they never see on this page: GoShip does not issue a waybill at
  // booking time anyway (status 900), so there is nothing to show them.
  //
  // What they DO need is the order to exist, and it already does by this point:
  // it is written, stock is decremented, and the id below is real. A fulfilment
  // that fails now leaves `shipping_error` on the row exactly as before, which
  // the admin list surfaces as "Chưa có vận đơn".
  const fulfil = fulfillOrder(supabase, orderId).catch((e) => {
    console.error(`Background fulfilment failed for order ${orderId}`, e);
  });

  // `waitUntil` keeps the isolate alive until the work finishes instead of it
  // being killed when the response is sent. Await it where the runtime does not
  // provide it, so a missing API degrades to the old slow-but-correct behaviour
  // rather than silently dropping every shipment.
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (typeof runtime?.waitUntil === "function") runtime.waitUntil(fulfil);
  else await fulfil;

  // Return the order row. The shipment may still be being booked — that is the
  // point — so tracking fields can be null here; the success page does not show
  // them, and the admin list and the status webhook fill them in.
  const { data: finalOrder } = await supabase
    .from("orders").select("*").eq("order_id", orderId).single();

  return json(req, finalOrder, 201);
});
