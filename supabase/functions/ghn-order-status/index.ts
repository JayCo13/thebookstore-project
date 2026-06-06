// Edge Function: ghn-order-status
// Replaces FastAPI `GET /orders/{id}/shipping-status` (admin) and
// `GET /orders/{id}/my-shipping-status` (owner). Returns { order_code, status }.
//
// Access: admin for any order, or the order owner for their own.
// Secrets: GHN_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { getOrderDetail } from "../_shared/ghn.ts";

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
    .from("orders").select("order_id, user_id, ghn_order_code").eq("order_id", orderId).maybeSingle();
  if (!order) return json(req, { detail: "Order not found" }, 404);
  if (!isAdmin && order.user_id !== caller?.user_id) {
    return json(req, { detail: "Access denied" }, 403);
  }

  if (!order.ghn_order_code) return json(req, { order_code: null, status: null });

  const detail = await getOrderDetail(order.ghn_order_code as string);
  const status = (detail?.status ?? detail?.current_status ?? detail?.Status ?? null) as string | null;
  return json(req, { order_code: order.ghn_order_code, status });
});
