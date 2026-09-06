// Edge Function: payos-webhook
// Replaces FastAPI `POST /payments/payos/webhook` (app/routers/payments.py).
//
// Flow (must stay idempotent — PayOS retries):
//   1. Verify HMAC-SHA256 signature against the `data` block.
//   2. Find what this payment belongs to:
//      a. an existing order (placed before the deferred flow, or a redelivery)
//         -> mark Paid + set paid_at;
//      b. a `pending_orders` row (the current flow: checkout parked the priced
//         basket and no order exists yet) -> create the order, already Paid.
//   3. Fulfill: submit to GHN with cod_amount=0 (customer already paid) and
//      send the order email. Both steps are idempotent (skip if already done),
//      so if the GHN submit fails we answer 500 and let PayOS redeliver rather
//      than acking an order that is paid but has no waybill.
//
// Money-correctness rule for (b): once PayOS says paid, an order MUST come out
// of this function. If the basket has gone out of stock in the meantime we
// still create the order and flag it "Cần kiểm tra" — refusing it here would
// keep the customer's money and leave them with nothing.
//
// Secrets: PAYOS_CHECKSUM_KEY (+ GHN_* / MAIL_* for fulfillment, see _shared).
//
// NOTE: this function must run WITHOUT the platform JWT gate so PayOS can reach
// it server-to-server — otherwise every webhook is rejected 401 before the
// function runs. That is declared in supabase/config.toml
// ([functions.payos-webhook] verify_jwt = false), which survives redeploys;
// `--no-verify-jwt` on the deploy command only covers that one deploy.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { verifyWebhookSignature } from "../_shared/payos.ts";
import { type FulfillResult, fulfillOrder } from "../_shared/fulfillment.ts";
import {
  checkStock,
  insertOrder,
  type OrderCreateBody,
  type PricedOrder,
} from "../_shared/orders.ts";

type Client = ReturnType<typeof serviceClient>;

/**
 * Fulfil a paid order and answer PayOS in the way that gets us what we need.
 *
 * 200 once the waybill exists. Otherwise 500 for a transient failure, because
 * PayOS only redelivers a webhook it did not get a 2xx for and that redelivery
 * is our automatic retry — fulfillOrder() is idempotent, so it resumes exactly
 * where the failed attempt stopped. A non-retryable failure (missing address,
 * GHN unconfigured) will never fix itself, so ack that one and leave
 * `ghn_error` on the row for an admin to act on.
 */
async function fulfilAndAnswer(
  req: Request,
  supabase: SupabaseClient,
  orderId: number,
): Promise<Response> {
  let result: FulfillResult;
  try {
    result = await fulfillOrder(supabase, orderId, { forceCodZero: true });
  } catch (e) {
    console.error("Fulfilment error for order", orderId, e);
    result = { ghnCode: null, ghnError: String(e), retryable: true };
  }

  if (result.ghnCode) return json(req, { success: true });

  if (result.retryable) {
    console.error(`Order ${orderId}: fulfilment failed, asking PayOS to redeliver — ${result.ghnError}`);
    return json(req, { detail: "Fulfilment pending, please retry" }, 500);
  }

  console.error(`Order ${orderId}: fulfilment needs manual fixing — ${result.ghnError}`);
  return json(req, { success: true });
}

/**
 * Turn a parked checkout into a real, already-paid order.
 *
 * Concurrency: PayOS can deliver the same notification twice. `consumed_at` is
 * claimed with a conditional UPDATE, so exactly one delivery does the insert;
 * the claim is released again if the insert fails, so a later retry can pick it
 * up rather than the payment being stranded.
 */
async function materialisePendingOrder(
  req: Request,
  supabase: Client,
  code: number,
  paidOk: boolean,
  paidAmount: number,
): Promise<Response> {
  const { data: pending, error: pendingErr } = await supabase
    .from("pending_orders").select("*").eq("payos_order_code", code).maybeSingle();
  if (pendingErr) {
    // A read failure is not the same as "nothing to do" — acking here would
    // throw away a real payment. Make PayOS come back instead.
    console.error("pending_orders lookup failed for", code, pendingErr);
    return json(req, { detail: "Lookup failed, please retry" }, 500);
  }
  if (!pending) {
    console.warn("No order and no pending checkout for payos orderCode", code);
    return json(req, { success: true }); // ack so PayOS stops retrying
  }

  // A previous delivery already created the order — finish its fulfilment.
  if (pending.order_id) {
    const { data: existing } = await supabase
      .from("orders").select("ghn_order_code").eq("order_id", pending.order_id).maybeSingle();
    if (existing?.ghn_order_code) return json(req, { success: true });
    return await fulfilAndAnswer(req, supabase, pending.order_id as number);
  }

  if (!paidOk) {
    // Cancelled or failed. Nothing was ever created, so there is nothing to
    // mark Failed — the row just stays unconsumed as an abandoned checkout.
    console.log(`PayOS pending checkout ${code} not paid; leaving it unconsumed`);
    return json(req, { success: true });
  }

  const { data: claimed } = await supabase
    .from("pending_orders")
    .update({ consumed_at: new Date().toISOString() })
    .eq("payos_order_code", code)
    .is("consumed_at", null)
    .select("payos_order_code")
    .maybeSingle();
  if (!claimed) {
    console.warn(`Pending checkout ${code} is being materialised by another delivery`);
    return json(req, { detail: "Materialisation in progress, please retry" }, 500);
  }

  const payload = pending.payload as { body?: OrderCreateBody; priced?: PricedOrder };
  const orderBody = (payload?.body ?? {}) as OrderCreateBody;
  const priced = payload?.priced;
  if (!priced || !Array.isArray(priced.items) || priced.items.length === 0) {
    console.error(`Pending checkout ${code} has no priced snapshot; cannot create the order`);
    await supabase.from("pending_orders")
      .update({ consumed_at: null }).eq("payos_order_code", code);
    return json(req, { detail: "Pending checkout is unusable" }, 500);
  }

  // The account, if the customer was signed in when they started checkout.
  let appUserId: number | null = null;
  if (pending.auth_id) {
    const { data: u } = await supabase
      .from("users").select("user_id").eq("auth_id", pending.auth_id).maybeSingle();
    appUserId = u?.user_id ?? null;
  }

  // PayOS is the source of truth for what was collected; a mismatch against the
  // amount we parked is worth flagging but never worth refusing the order.
  if (paidAmount && paidAmount !== Number(pending.amount ?? 0)) {
    console.warn(
      `PayOS amount mismatch on pending checkout ${code}: expected ${pending.amount}, paid ${paidAmount}`,
    );
  }

  const stockWarnings = await checkStock(supabase, priced.items);
  if (stockWarnings.length) {
    console.error(
      `Pending checkout ${code} went out of stock before payment: ${stockWarnings.join("; ")}. ` +
      "Creating the order anyway — the customer has paid.",
    );
  }

  const inserted = await insertOrder(supabase, orderBody, priced, appUserId, {
    overrides: {
      payment_status: "Paid",
      paid_at: new Date().toISOString(),
      status: stockWarnings.length ? "Cần kiểm tra" : "Processing",
      payos_order_code: code,
      payos_payment_link_id: pending.payos_payment_link_id ?? null,
      payos_checkout_url: pending.payos_checkout_url ?? null,
    },
  });

  if (!inserted.ok) {
    // Release the claim so the next delivery can try again.
    console.error(`Failed to materialise pending checkout ${code}: ${inserted.detail}`);
    await supabase.from("pending_orders")
      .update({ consumed_at: null }).eq("payos_order_code", code);
    return json(req, { detail: "Failed to create order" }, 500);
  }

  await supabase.from("pending_orders")
    .update({ order_id: inserted.orderId }).eq("payos_order_code", code);
  console.log(`Pending checkout ${code} materialised as order ${inserted.orderId}`);

  return await fulfilAndAnswer(req, supabase, inserted.orderId);
}

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
  // No order row: this is the current flow, where checkout only parked the
  // basket and the order is created here, on payment.
  if (!order) {
    const paidOk = String((body as { code?: string }).code ?? "") === "00";
    return await materialisePendingOrder(
      req, supabase, orderCode, paidOk, Number(data.amount ?? 0),
    );
  }

  // Idempotent: ack a payment we finished. But "Paid with no waybill" means an
  // earlier delivery died between the payment update and the GHN submit — this
  // redelivery is the chance to finish the job, so don't ack it away or the
  // order stays paid-but-never-shipped forever.
  if (String(order.payment_status ?? "").toLowerCase() === "paid") {
    if (order.ghn_order_code) return json(req, { success: true });
    console.warn(`Order ${order.order_id} is Paid with no GHN waybill; retrying fulfilment`);
    return await fulfilAndAnswer(req, supabase, order.order_id);
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
  return await fulfilAndAnswer(req, supabase, order.order_id);
});
