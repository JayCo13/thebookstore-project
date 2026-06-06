// Edge Function: create-order
// Replaces FastAPI `POST /orders/` (app/routers/orders.py create_order).
//
// Flow (ported faithfully):
//   1. Resolve caller — authenticated user (maps auth.uid() -> app user_id) or guest.
//   2. Validate line items (books via `items`, stationery via `items`/`ghn_items`):
//      existence + stock, compute price (discounted_price ?? price), sum total.
//   3. Resolve shipping address (saved id / new+save / inline / guest fields).
//   4. Insert order (Pending, Unpaid) + order_items, decrement stock.
//   5. COD  -> fulfill INLINE: GHN submit + order email (customer + admin).
//      PayOS -> defer: stay Unpaid, no GHN/email; frontend calls
//               `payos-create-link` next and the webhook fulfils on payment.
//
// Runs with service_role (bypasses RLS) — orders have no client INSERT policy.
// Secrets: GHN_* + MAIL_* / ADMIN_EMAIL (for the COD inline fulfilment).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";
import { fulfillOrder } from "../_shared/fulfillment.ts";

interface OrderItemIn { book_id?: number | null; stationery_id?: number | null; quantity: number }
interface GhnItemIn { stationery_id?: number | null; name?: string; quantity: number; price: number }
interface AddressIn {
  phone_number: string; address_line1: string; address_line2?: string | null;
  city: string; postal_code: string; country: string; is_default_shipping?: boolean;
}
interface OrderCreateBody {
  items: OrderItemIn[];
  ghn_items?: GhnItemIn[] | null;
  shipping_address_id?: number | null;
  shipping_address?: AddressIn | null;
  save_address?: boolean;
  guest_email?: string | null;
  shipping_phone_number?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  shipping_method?: string | null;
  payment_method?: string | null;
  cod_amount?: number | null;
  shipping_full_name?: string | null;
  ghn_province_id?: number | null;
  ghn_district_id?: number | null;
  ghn_ward_code?: string | null;
  ghn_province_name?: string | null;
  ghn_district_name?: string | null;
  ghn_ward_name?: string | null;
  shipping_service_id?: number | null;
  shipping_fee?: number | null;
  package_weight?: number | null;
  package_length?: number | null;
  package_width?: number | null;
  package_height?: number | null;
}

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
  let userEmail: string | null = null;
  try {
    const { data: { user } } = await userClient(req).auth.getUser();
    if (user) {
      const { data: u } = await supabase
        .from("users").select("user_id, email").eq("auth_id", user.id).maybeSingle();
      appUserId = u?.user_id ?? null;
      userEmail = u?.email ?? null;
    }
  } catch {
    // No/invalid token → treat as guest (matches get_current_user_optional).
  }

  // ── 2. Validate items + compute total ────────────────────────────────────
  let totalAmount = 0;
  // Collected rows to insert + stock decrements to apply after the order exists.
  const orderItemRows: Array<{ book_id?: number; stationery_id?: number; quantity: number; price_at_purchase: number }> = [];
  const stockDec: Array<{ table: "books" | "stationery"; id: number; qty: number; current: number }> = [];

  // Books (and any stationery passed inside `items`).
  for (const item of body.items) {
    const qty = Number(item.quantity ?? 0);
    if (qty <= 0) continue;

    if (item.book_id) {
      const { data: book } = await supabase
        .from("books").select("book_id, title, price, discounted_price, stock_quantity")
        .eq("book_id", item.book_id).maybeSingle();
      if (!book) return json(req, { detail: `Book with ID ${item.book_id} not found` }, 404);
      if ((book.stock_quantity ?? 0) < qty) {
        return json(req, { detail: `Insufficient stock for book: ${book.title}` }, 400);
      }
      const price = book.discounted_price ?? book.price;
      totalAmount += price * qty;
      orderItemRows.push({ book_id: book.book_id, quantity: qty, price_at_purchase: price });
      stockDec.push({ table: "books", id: book.book_id, qty, current: book.stock_quantity });
    } else if (item.stationery_id) {
      const { data: st } = await supabase
        .from("stationery").select("stationery_id, title, price, discounted_price, stock_quantity")
        .eq("stationery_id", item.stationery_id).maybeSingle();
      if (!st) return json(req, { detail: `Stationery with ID ${item.stationery_id} not found` }, 404);
      if ((st.stock_quantity ?? 0) < qty) {
        return json(req, { detail: `Insufficient stock for stationery: ${st.title}` }, 400);
      }
      const price = st.discounted_price ?? st.price;
      totalAmount += price * qty;
      orderItemRows.push({ stationery_id: st.stationery_id, quantity: qty, price_at_purchase: price });
      stockDec.push({ table: "stationery", id: st.stationery_id, qty, current: st.stock_quantity });
    }
  }

  // Stationery passed via ghn_items (legacy frontend shape).
  for (const gi of body.ghn_items ?? []) {
    const sid = gi.stationery_id;
    const qty = Number(gi.quantity ?? 0);
    if (!sid || qty <= 0) continue;
    const { data: st } = await supabase
      .from("stationery").select("stationery_id, title, price, stock_quantity")
      .eq("stationery_id", sid).maybeSingle();
    if (!st) return json(req, { detail: `Stationery with ID ${sid} not found` }, 404);
    if ((st.stock_quantity ?? 0) < qty) {
      return json(req, { detail: `Insufficient stock for stationery: ${st.title}` }, 400);
    }
    const price = Number(gi.price ?? 0) || st.price;
    totalAmount += price * qty;
    orderItemRows.push({ stationery_id: sid, quantity: qty, price_at_purchase: price });
    stockDec.push({ table: "stationery", id: sid, qty, current: st.stock_quantity });
  }

  if (orderItemRows.length === 0) {
    return json(req, { detail: "No valid items in order" }, 400);
  }

  // ── 3. Resolve shipping address ──────────────────────────────────────────
  let ship = {
    phone: body.shipping_phone_number ?? null,
    line1: body.shipping_address_line1 ?? null,
    line2: body.shipping_address_line2 ?? null,
    city: body.shipping_city ?? null,
    postal: body.shipping_postal_code ?? null,
    country: body.shipping_country ?? null,
  };

  if (appUserId) {
    if (body.shipping_address_id) {
      const { data: addr } = await supabase
        .from("addresses").select("*")
        .eq("address_id", body.shipping_address_id).eq("user_id", appUserId).maybeSingle();
      if (!addr) return json(req, { detail: "Shipping address not found" }, 404);
      ship = {
        phone: addr.phone_number, line1: addr.address_line1, line2: addr.address_line2,
        city: addr.city, postal: addr.postal_code, country: addr.country,
      };
    } else if (body.shipping_address) {
      const a = body.shipping_address;
      if (body.save_address) {
        await supabase.from("addresses").insert({
          user_id: appUserId, phone_number: a.phone_number,
          address_line1: a.address_line1, address_line2: a.address_line2 ?? null,
          city: a.city, postal_code: a.postal_code, country: a.country,
          is_default_shipping: a.is_default_shipping ?? false,
        });
      }
      ship = {
        phone: a.phone_number, line1: a.address_line1, line2: a.address_line2 ?? null,
        city: a.city, postal: a.postal_code, country: a.country,
      };
    }
  }

  // ── 4. Insert order + items, decrement stock ─────────────────────────────
  const isPayos = (body.payment_method ?? "").toLowerCase() === "payos";

  const orderInsert: Record<string, unknown> = {
    user_id: appUserId,
    total_amount: totalAmount,
    status: "Pending",
    payment_status: "Unpaid",
    guest_email: appUserId ? null : (body.guest_email ?? null),
    shipping_phone_number: ship.phone,
    shipping_address_line1: ship.line1,
    shipping_address_line2: ship.line2,
    shipping_city: ship.city,
    shipping_postal_code: ship.postal,
    shipping_country: ship.country,
    shipping_method: body.shipping_method ?? null,
    payment_method: body.payment_method ?? null,
    cod_amount: body.cod_amount ?? null,
    shipping_full_name: body.shipping_full_name ?? null,
    ghn_province_id: body.ghn_province_id ?? null,
    ghn_district_id: body.ghn_district_id ?? null,
    ghn_ward_code: body.ghn_ward_code ?? null,
    ghn_province_name: body.ghn_province_name ?? null,
    ghn_district_name: body.ghn_district_name ?? null,
    ghn_ward_name: body.ghn_ward_name ?? null,
    shipping_service_id: body.shipping_service_id ?? null,
    shipping_fee: body.shipping_fee ?? null,
    package_weight: body.package_weight ?? null,
    package_length: body.package_length ?? null,
    package_width: body.package_width ?? null,
    package_height: body.package_height ?? null,
  };

  const { data: order, error: orderErr } = await supabase
    .from("orders").insert(orderInsert).select("order_id").single();
  if (orderErr || !order) {
    console.error("Order insert failed", orderErr);
    return json(req, { detail: "Failed to create order" }, 500);
  }
  const orderId = order.order_id as number;

  const { error: itemsErr } = await supabase
    .from("order_items").insert(orderItemRows.map((r) => ({ ...r, order_id: orderId })));
  if (itemsErr) {
    console.error("Order items insert failed; rolling back order", itemsErr);
    await supabase.from("orders").delete().eq("order_id", orderId);
    return json(req, { detail: "Failed to create order items" }, 500);
  }

  // Decrement stock (read-modify-write, matching the original semantics).
  for (const d of stockDec) {
    const idCol = d.table === "books" ? "book_id" : "stationery_id";
    await supabase.from(d.table)
      .update({ stock_quantity: Math.max(0, d.current - d.qty) })
      .eq(idCol, d.id);
  }

  // ── 5. Fulfil ────────────────────────────────────────────────────────────
  if (isPayos) {
    // Defer: the order stays Unpaid. Frontend calls payos-create-link next;
    // the PayOS webhook fulfils (GHN cod=0 + email) once payment confirms.
    console.log(`PayOS order ${orderId}; deferring GHN + email until webhook`);
  } else {
    // COD (and any non-PayOS): fulfil inline — GHN submit + order email.
    // Fire-and-forget semantics: a fulfilment hiccup must not fail the order.
    try {
      await fulfillOrder(supabase, orderId);
    } catch (e) {
      console.error(`Inline fulfilment failed for order ${orderId}`, e);
    }
  }

  // Return the full order row (refetched so ghn_order_code/paid fields are current).
  const { data: finalOrder } = await supabase
    .from("orders").select("*").eq("order_id", orderId).single();

  return json(req, finalOrder, 201);
});
