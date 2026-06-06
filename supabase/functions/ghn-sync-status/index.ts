// Edge Function: ghn-sync-status
// Replaces FastAPI `POST /orders/sync-ghn-status` (admin batch sync).
//
// Fetches GHN order detail for every order with a ghn_order_code that isn't
// already in a terminal state, and updates orders.status when it changed.
// Admin only.
//
// Secrets: GHN_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { getOrderDetail, ghnConfigured } from "../_shared/ghn.ts";

const TERMINAL = ["delivered", "cancelled", "returned"];
const CONCURRENCY = 10;

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

  if (!ghnConfigured()) return json(req, { detail: "GHN service is not configured" }, 503);

  const { data: orders } = await supabase
    .from("orders")
    .select("order_id, ghn_order_code, status")
    .not("ghn_order_code", "is", null)
    .neq("ghn_order_code", "");

  const toSync = (orders ?? []).filter(
    (o) => !TERMINAL.includes(String(o.status ?? "").toLowerCase()),
  );
  if (toSync.length === 0) {
    return json(req, { message: "Không có đơn hàng cần đồng bộ" });
  }

  // Bounded-concurrency pool.
  let updated = 0;
  let idx = 0;
  async function worker() {
    while (idx < toSync.length) {
      const o = toSync[idx++];
      try {
        const detail = await getOrderDetail(o.ghn_order_code as string);
        const newStatus = detail?.status as string | undefined;
        if (newStatus && newStatus !== o.status) {
          await supabase.from("orders").update({ status: newStatus }).eq("order_id", o.order_id);
          updated++;
        }
      } catch (e) {
        console.warn(`GHN sync failed for order ${o.order_id}`, e);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toSync.length) }, worker));

  return json(req, { message: `Đã đồng bộ ${updated}/${toSync.length} đơn hàng từ GHN` });
});
