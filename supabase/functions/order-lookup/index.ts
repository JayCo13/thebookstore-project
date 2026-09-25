// Edge Function: order-lookup
// The only way an unauthenticated visitor can read an order.
//
// Guest checkout has no account, so there is no identity for RLS to match on —
// which is why the previous approach (an anonymous SELECT policy scoped to
// `user_id is null`) could not work: a policy is a filter, not an endpoint, and
// the anon key is published in the browser bundle, so `GET /rest/v1/orders`
// returned every guest order in the table. See the migration for the details.
//
// A secret the visitor holds is the only thing that can stand in for an
// identity here, so this takes `orders.public_token` and nothing else. No
// order_id, no payos_order_code: both are sequential and were trivially
// enumerable.
//
// Request:  { token: "<uuid>" }
// Response: the order, projected to what the success page renders — or
//           { pending: true } when the token belongs to a PayOS checkout whose
//           payment has not landed yet and whose order therefore does not exist.
//
// Secrets: SUPABASE_* (injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

/**
 * What the success page is allowed to see.
 *
 * An explicit list, not `select *`: the row also carries internal fields
 * (shipping_error, carrier_shipment_id, shipping_rate_id, the customer's
 * user_id) that belong in the admin panel, not in a page anyone holding a link
 * can open.
 */
const ORDER_FIELDS = [
  "order_id",
  "order_date",
  "status",
  "payment_method",
  "payment_status",
  "total_amount",
  "shipping_fee",
  "shipping_full_name",
  "shipping_phone_number",
  "shipping_address_line1",
  "shipping_address_line2",
  "ship_ward_name",
  "ship_district_name",
  "ship_province_name",
  "carrier",
  "tracking_code",
  "tracking_url",
  "shipping_service_code",
  "payos_order_code",
  "payos_checkout_url",
].join(", ");

const ITEM_FIELDS =
  "quantity, price_at_purchase, book:books(title, slug, image_url), stationery:stationery(title, slug, image_url)";

/** A token is a uuid. Anything else is not worth a database round trip. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let token = "";
  try {
    token = String((await req.json())?.token ?? "").trim();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }
  if (!UUID.test(token)) return json(req, { detail: "Mã đơn hàng không hợp lệ" }, 400);

  const supabase = serviceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`${ORDER_FIELDS}, order_items(${ITEM_FIELDS})`)
    .eq("public_token", token)
    .maybeSingle();

  if (order) return json(req, { order });

  // No order yet. A PayOS customer lands here the moment they pay, which can be
  // before the webhook has materialised the order — so a token that matches an
  // unconsumed checkout means "wait", not "wrong link". Distinguishing the two
  // is what stops the page telling a paying customer their order does not exist.
  const { data: pending } = await supabase
    .from("pending_orders")
    .select("payos_order_code, amount, consumed_at")
    .eq("public_token", token)
    .maybeSingle();

  if (pending) {
    return json(req, {
      pending: true,
      payos_order_code: pending.payos_order_code,
      amount: pending.amount,
    });
  }

  // Same answer for a malformed token and one that simply does not exist:
  // anything else would let someone probe which tokens are real.
  return json(req, { detail: "Không tìm thấy đơn hàng" }, 404);
});
