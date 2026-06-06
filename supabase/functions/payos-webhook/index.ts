// Edge Function: payos-webhook
// Replaces FastAPI `POST /payments/payos/webhook` (app/routers/payments.py).
//
// Flow (must stay idempotent — PayOS retries):
//   1. Verify HMAC-SHA256 signature against the `data` block.
//   2. Look the order up by payos_order_code; mark Paid + set paid_at.
//   3. Fulfill: submit to GHN with cod_amount=0 (customer already paid) and
//      send the order email. Both steps are idempotent (skip if already done).
//
// Secrets: PAYOS_CHECKSUM_KEY (+ GHN_* / MAIL_* for fulfillment, see _shared).
//
// NOTE: this function must be deployed WITHOUT JWT verification so PayOS can
// reach it server-to-server:  supabase functions deploy payos-webhook --no-verify-jwt
import { json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { verifyWebhookSignature } from "../_shared/payos.ts";
import { fulfillOrder } from "../_shared/fulfillment.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let body: { signature?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON" }, 400);
  }

  // PayOS sends a confirmation ping with a sentinel orderCode when you register
  // the webhook URL — accept it without touching any order.
  const data = body.data ?? {};
  if (!(await verifyWebhookSignature(body))) {
    console.error("PayOS webhook signature mismatch");
    return json(req, { detail: "Invalid signature" }, 400);
  }

  const orderCode = Number(data.orderCode);
  if (!orderCode) {
    // Verification ping — signature valid but no real order.
    return json(req, { success: true });
  }

  const supabase = serviceClient();
  // We use order_id as the PayOS orderCode, so try both columns.
  let { data: order } = await supabase
    .from("orders").select("*").eq("payos_order_code", orderCode).maybeSingle();
  if (!order) {
    ({ data: order } = await supabase
      .from("orders").select("*").eq("order_id", orderCode).maybeSingle());
  }
  if (!order) {
    console.warn("No order for payos orderCode", orderCode);
    return json(req, { success: true }); // ack so PayOS stops retrying
  }

  // Idempotent: already Paid → just ack.
  if (String(order.payment_status ?? "").toLowerCase() === "paid") {
    return json(req, { success: true });
  }

  // PayOS uses top-level code == "00" for success. Anything else = failure.
  if (String((body as { code?: string }).code ?? "") !== "00") {
    await supabase.from("orders").update({ payment_status: "Failed" }).eq("order_id", order.order_id);
    console.log("PayOS order marked Failed", order.order_id);
    return json(req, { success: true });
  }

  // Amount cross-check (PayOS is source of truth; we only flag mismatches).
  const paidAmount = Number(data.amount ?? 0);
  const expected = await (async () => {
    const { data: items } = await supabase
      .from("order_items")
      .select("book:books(is_free_ship), stationery:stationery(is_free_ship)")
      .eq("order_id", order.order_id);
    const freeShip = (items ?? []).some((it) => it.book?.is_free_ship || it.stationery?.is_free_ship);
    return Number(order.total_amount ?? 0) + (freeShip ? 0 : Number(order.shipping_fee ?? 0));
  })();
  if (paidAmount && paidAmount !== expected) {
    console.warn(`PayOS amount mismatch order=${order.order_id} expected=${expected} paid=${paidAmount}`);
  }

  const { error: updErr } = await supabase
    .from("orders")
    .update({
      payment_status: "Paid",
      status: (!order.status || String(order.status).toLowerCase() === "pending") ? "Processing" : order.status,
      paid_at: new Date().toISOString(),
    })
    .eq("order_id", order.order_id);
  if (updErr) {
    console.error("Failed to mark order paid", updErr);
    return json(req, { detail: "Update failed" }, 500);
  }
  order.payment_status = "Paid";

  // Fulfill (GHN cod=0 + order email). Idempotent inside fulfillOrder.
  try {
    await fulfillOrder(supabase, order.order_id, { forceCodZero: true });
  } catch (e) {
    // Don't fail the webhook on a fulfilment hiccup — the order is paid and a
    // retry/cron can re-run fulfilment. Log loudly.
    console.error("Fulfilment error for order", order.order_id, e);
  }

  return json(req, { success: true });
});
