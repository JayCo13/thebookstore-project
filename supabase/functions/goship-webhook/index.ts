// Edge Function: goship-webhook
// Receives shipment status pushes from GoShip.
//
// Register the endpoint at the GoShip portal (Kết nối API → Goship API
// Webhooks), pointing at this function's URL. GoShip signs each push with
// HMAC-SHA256 in `x-goship-hmac-sha256`.
//
// Payload (flat): gcode, code, order_id, status, status_text, description,
//   message, fee, cod, amount_return_shop, carrier_short_name, tracking_url,
//   sorting_code, is_return, is_part_delivery, is_lost, update_time (unix GMT+7).
//
// ANSWER 200 TO EVERYTHING WE CANNOT ACT ON. GoShip retries after 3 minutes and
// gives up after 3 failures, so a body we can't use is logged and acked — a
// retry would not make it parseable. The one thing a retry does fix is a
// transient database failure, and that is the only case that answers 500.
//
// Secrets: GOSHIP_CLIENT_SECRET (signs the pushes) + SUPABASE_* injected.
//
// NOTE: this function must run WITHOUT the platform JWT gate — GoShip calls it
// server-to-server with no Supabase session. Declared in supabase/config.toml
// ([functions.goship-webhook] verify_jwt = false), which survives redeploys;
// `--no-verify-jwt` on the deploy command only covers that one deploy.
import { json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import {
  mapGoshipStatus,
  parseGoshipTime,
  parseOrderRef,
  TERMINAL_STATUS_CODES,
  verifyWebhookSignature,
} from "../_shared/goship.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(req, { error: true, message: "Method not allowed" }, 200);

  // The signature covers the bytes as sent, so the raw text has to be kept —
  // re-serialising a parsed object would not reproduce it.
  const raw = await req.text();

  const signature = req.headers.get("x-goship-hmac-sha256") ??
    req.headers.get("X-Goship-Hmac-Sha256") ?? "";
  if (!await verifyWebhookSignature(raw, signature)) {
    console.warn("GoShip webhook: bad or missing signature");
    return json(req, { error: true, message: "Invalid signature" }, 200);
  }

  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    // Accept a flat body or one wrapped in `data`, since the portal's test
    // pushes and the live ones have differed for other integrations.
    data = (parsed?.data && typeof parsed.data === "object" && !Array.isArray(parsed.data))
      ? parsed.data
      : parsed;
  } catch {
    console.warn("GoShip webhook: unparseable body");
    return json(req, { error: true, message: "Invalid JSON" }, 200);
  }

  const statusCode = Number(data.status ?? data.status_code ?? 0);
  if (!statusCode) {
    console.warn("GoShip webhook: missing status", raw.slice(0, 300));
    return json(req, { error: true, message: "Missing status" }, 200);
  }

  // The timestamp is half of the dedup key; inventing one would let a
  // redelivery through as a new event.
  const statusAt = parseGoshipTime(data.update_time);
  if (!statusAt) {
    console.warn("GoShip webhook: unparseable update_time", data.update_time);
    return json(req, { error: true, message: "Bad update_time" }, 200);
  }

  const supabase = serviceClient();
  const gcode = data.gcode ? String(data.gcode) : null;          // GoShip's id
  const carrierWaybill = realCode(data.code);                     // the carrier's

  // Find the order: our own reference first (BK<order_id>, which we send as
  // `order_id`), then GoShip's shipment id. The reference path also heals an
  // order whose booking timed out after GoShip had already accepted it.
  const refId = parseOrderRef(String(data.order_id ?? ""));
  const cols = "order_id, status, tracking_code, carrier, carrier_shipment_id, carrier_status_code";
  let order: Record<string, unknown> | null = null;

  if (refId) {
    const { data: row } = await supabase
      .from("orders").select(cols).eq("order_id", refId).maybeSingle();
    order = row ?? null;
  }
  if (!order && gcode) {
    const { data: row } = await supabase
      .from("orders").select(cols).eq("carrier_shipment_id", gcode).maybeSingle();
    order = row ?? null;
  }
  if (!order) {
    console.warn(`GoShip webhook: no order for order_id=${data.order_id ?? "-"} gcode=${gcode ?? "-"}`);
    return json(req, { error: false, message: "Order not found, bypassed" }, 200);
  }

  const orderId = order.order_id as number;

  // Once delivered, cancelled, returned or lost, nothing later should move it.
  const currentCode = Number(order.carrier_status_code ?? 0);
  if (currentCode && TERMINAL_STATUS_CODES.has(currentCode)) {
    console.log(`GoShip webhook: order ${orderId} already final (${currentCode}); ignoring ${statusCode}`);
    return json(req, { error: false, message: "Already final" }, 200);
  }

  // Record the event. The (order_id, status_code, status_at) unique index is
  // what makes a redelivery a no-op: the insert conflicts and we stop here
  // rather than re-applying side effects.
  const { error: insertErr } = await supabase.from("shipping_events").insert({
    order_id: orderId,
    tracking_code: carrierWaybill ?? gcode,
    status_code: statusCode,
    status_name: data.status_text ? String(data.status_text) : null,
    location: null, // GoShip reports progress, not a current location
    note: [data.message, data.description].filter(Boolean).map(String).join(" — ") || null,
    reason_code: null,
    is_returning: Number(data.is_return ?? 0) === 1,
    carrier_code: data.carrier_short_name ? String(data.carrier_short_name) : null,
    status_at: statusAt.toISOString(),
    raw_payload: data,
  });

  if (insertErr) {
    // 23505 = unique_violation: we have seen this exact event before.
    if (insertErr.code === "23505") {
      return json(req, { error: false, message: "Duplicate event" }, 200);
    }
    console.error(`GoShip webhook: could not record event for order ${orderId}`, insertErr);
    return json(req, { error: true, message: "Storage failure" }, 500);
  }

  const mapped = mapGoshipStatus(statusCode);
  const update: Record<string, unknown> = {
    carrier_status_code: statusCode,
    carrier_status_name: data.status_text ? String(data.status_text) : null,
    carrier_status_at: statusAt.toISOString(),
    carrier_is_returning: Number(data.is_return ?? 0) === 1,
  };
  // Learn what the booking could not tell us: GoShip's id if the create call
  // never returned, and the carrier's waybill, which is assigned later.
  if (gcode && !order.carrier_shipment_id) update.carrier_shipment_id = gcode;
  if (carrierWaybill && !order.tracking_code) {
    update.tracking_code = carrierWaybill;
    update.shipping_error = null;
  }
  if (carrierWaybill && data.tracking_url) update.tracking_url = String(data.tracking_url);
  if (data.carrier_short_name) update.shipping_service_code = String(data.carrier_short_name);
  // An unmapped code still gets its snapshot and its event row; it just doesn't
  // move the order's own status, which stays whatever it last legitimately was.
  if (mapped && mapped !== order.status) update.status = mapped;

  const { error: updateErr } = await supabase.from("orders").update(update).eq("order_id", orderId);
  if (updateErr) {
    console.error(`GoShip webhook: could not update order ${orderId}`, updateErr);
    return json(req, { error: true, message: "Storage failure" }, 500);
  }

  console.log(
    `GoShip webhook: order ${orderId} ${order.status} -> ${mapped ?? order.status} ` +
    `(${statusCode} ${data.status_text ?? ""}, ${data.carrier_short_name ?? "?"})`,
  );
  return json(req, { error: false, message: "OK" }, 200);
});

/** GoShip sends the literal string "NULL" for a waybill it does not have yet. */
function realCode(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return !s || s.toUpperCase() === "NULL" ? null : s;
}
