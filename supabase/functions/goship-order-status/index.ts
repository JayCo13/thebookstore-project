// Edge Function: goship-order-status
// Live shipment status for one order: { tracking_code, carrier, status, … }.
//
// Access: admin for any order, or the order owner for their own.
// Secrets: GOSHIP_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { findShipmentByOrder, mapGoshipStatus } from "../_shared/goship.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  // order_id from query (?order_id=) or JSON body.
  let orderId: number | null = null;
  const url = new URL(req.url);
  if (url.searchParams.get("order_id")) orderId = Number(url.searchParams.get("order_id"));
  if (!orderId && req.method === "POST") {
    try { orderId = Number((await req.json())?.order_id); } catch { /* ignore */ }
  }
  if (!orderId) return json(req, { detail: "order_id required" }, 400);

  const supabase = serviceClient();
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json(req, { detail: "Not authenticated" }, 401);
  const { data: caller } = await supabase
    .from("users").select("user_id, role:roles(role_name)").eq("auth_id", user.id).maybeSingle();
  const isAdmin = caller?.role?.role_name === "Admin";

  const { data: order } = await supabase
    .from("orders")
    .select("order_id, user_id, tracking_code, tracking_url, carrier, carrier_shipment_id, status, carrier_status_code, shipping_service_code")
    .eq("order_id", orderId).maybeSingle();
  if (!order) return json(req, { detail: "Order not found" }, 404);
  if (!isAdmin && order.user_id !== caller?.user_id) {
    return json(req, { detail: "Access denied" }, 403);
  }

  const stored = {
    tracking_code: order.tracking_code,
    tracking_url: order.tracking_url,
    carrier: order.carrier,
    carrier_code: order.shipping_service_code,
    status: order.status,
    status_code: order.carrier_status_code,
  };

  // Orders shipped before the move to GoShip live at a carrier we no longer
  // talk to. Their last known status is the one stored on the row.
  if (order.carrier !== "GOSHIP" || !order.carrier_shipment_id) {
    return json(req, { ...stored, stale: order.carrier !== "GOSHIP" });
  }

  const shipment = await findShipmentByOrder(supabase, orderId);
  if (!shipment) return json(req, { ...stored, stale: true });

  const mapped = shipment.statusCode ? mapGoshipStatus(shipment.statusCode) : null;
  return json(req, {
    ...stored,
    // Prefer what GoShip says, but never blank a field it did not answer for.
    tracking_code: shipment.trackingNumber ?? stored.tracking_code,
    tracking_url: shipment.trackingUrl ?? stored.tracking_url,
    carrier_code: shipment.carrier ?? stored.carrier_code,
    status: mapped ?? stored.status,
    status_code: shipment.statusCode ?? stored.status_code,
    status_text: shipment.statusText,
  });
});
