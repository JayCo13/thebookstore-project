// Edge Function: goship-sync-status
// Admin batch sync — reconciles every in-flight shipment with GoShip.
//
// The webhook (`goship-webhook`) is the primary path and this is the safety
// net: a push GoShip retries three times and then abandons is gone for good,
// and the admin panel's "Đồng bộ vận chuyển" button is how that gets noticed.
//
// One listing covers the job. GoShip's /shipments only returns shipments that
// are still in flight, which is exactly the set whose status can still change —
// so this is a couple of paginated calls, not one call per open order.
//
// Secrets: GOSHIP_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { goshipConfigured, listShipments, mapGoshipStatus, parseOrderRef } from "../_shared/goship.ts";

const MAX_PAGES = 10;
const PAGE_SIZE = 100;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  const supabase = serviceClient();

  // Admin gate.
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json(req, { detail: "Not authenticated" }, 401);
  const { data: caller } = await supabase
    .from("users").select("role:roles(role_name)").eq("auth_id", user.id).maybeSingle();
  if (caller?.role?.role_name !== "Admin") return json(req, { detail: "Admin only" }, 403);

  if (!goshipConfigured()) return json(req, { detail: "GoShip chưa được cấu hình" }, 503);

  let updated = 0;
  let seen = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const shipments = await listShipments(supabase, page, PAGE_SIZE);
    if (shipments.length === 0) break;
    seen += shipments.length;

    for (const s of shipments) {
      // Match on our own reference where GoShip echoes it, else on its id.
      const refId = s.orderRef ? parseOrderRef(s.orderRef) : null;
      const query = supabase
        .from("orders")
        .select("order_id, status, tracking_code, carrier_status_code");
      const { data: order } = refId
        ? await query.eq("order_id", refId).maybeSingle()
        : await query.eq("carrier_shipment_id", s.id).maybeSingle();
      if (!order) continue;

      const mapped = s.statusCode ? mapGoshipStatus(s.statusCode) : null;
      const update: Record<string, unknown> = {};
      if (s.statusCode && s.statusCode !== order.carrier_status_code) {
        update.carrier_status_code = s.statusCode;
        update.carrier_status_name = s.statusText;
      }
      if (mapped && mapped !== order.status) update.status = mapped;
      // The waybill is assigned after booking, so a sync is often how we learn it.
      if (s.trackingNumber && !order.tracking_code) {
        update.tracking_code = s.trackingNumber;
        update.tracking_url = s.trackingUrl;
        update.shipping_error = null;
      }
      if (Object.keys(update).length === 0) continue;

      const { error } = await supabase.from("orders").update(update).eq("order_id", order.order_id);
      if (error) console.warn(`GoShip sync: order ${order.order_id} update failed`, error);
      else updated++;
    }

    if (shipments.length < PAGE_SIZE) break;
  }

  if (seen === 0) return json(req, { message: "Không có đơn hàng nào đang vận chuyển" });
  return json(req, { message: `Đã đồng bộ ${updated}/${seen} đơn hàng từ GoShip` });
});
