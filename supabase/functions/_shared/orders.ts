// Order pricing and insertion — the half of `create-order` that the PayOS
// webhook also needs.
//
// COD creates its order during checkout, PayOS only after the money lands, so
// both paths run the same two steps: price the basket (validate the items, look
// up the prices, resolve the shipping address), then write the order. Splitting
// them also lets PayOS price at checkout time and insert at payment time, which
// is what makes the customer pay for exactly what they get quoted.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface OrderItemIn { book_id?: number | null; stationery_id?: number | null; quantity: number }
export interface GhnItemIn { stationery_id?: number | null; name?: string; quantity: number; price: number }
export interface AddressIn {
  phone_number: string; address_line1: string; address_line2?: string | null;
  city: string; postal_code: string; country: string; is_default_shipping?: boolean;
}
export interface OrderCreateBody {
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

export interface OrderItemRow {
  book_id?: number;
  stationery_id?: number;
  quantity: number;
  price_at_purchase: number;
}

export interface ShippingFields {
  phone: string | null; line1: string | null; line2: string | null;
  city: string | null; postal: string | null; country: string | null;
}

/** A basket that has been validated and priced — everything needed to insert an order. */
export interface PricedOrder {
  totalAmount: number;
  items: OrderItemRow[];
  ship: ShippingFields;
  /** Any free-ship line item means the customer is not charged shipping. */
  hasFreeShip: boolean;
  /** Non-empty when stock ran out after pricing; only possible on the deferred PayOS path. */
  stockWarnings: string[];
}

export type PriceResult =
  | { ok: true; priced: PricedOrder }
  | { ok: false; status: number; detail: string };

interface PriceOpts {
  /**
   * Report insufficient stock instead of rejecting. Used when the customer has
   * already paid: refusing the order there would take the money and leave them
   * with nothing, so we record the order and flag it for a human instead.
   */
  tolerateStock?: boolean;
}

/** The customer-facing total: merchandise plus shipping, unless anything ships free. */
export function grandTotal(priced: PricedOrder, shippingFee: number | null | undefined): number {
  return priced.totalAmount + (priced.hasFreeShip ? 0 : Number(shippingFee ?? 0));
}

export async function priceOrder(
  supabase: SupabaseClient,
  body: OrderCreateBody,
  appUserId: number | null,
  opts: PriceOpts = {},
): Promise<PriceResult> {
  let totalAmount = 0;
  let hasFreeShip = false;
  const items: OrderItemRow[] = [];
  const stockWarnings: string[] = [];

  const shortStock = (label: string, title: string): { ok: false; status: number; detail: string } | null => {
    if (opts.tolerateStock) {
      stockWarnings.push(`${label}: ${title}`);
      return null;
    }
    return { ok: false, status: 400, detail: `Insufficient stock for ${label}: ${title}` };
  };

  // Books (and any stationery passed inside `items`).
  for (const item of body.items ?? []) {
    const qty = Number(item.quantity ?? 0);
    if (qty <= 0) continue;

    if (item.book_id) {
      const { data: book } = await supabase
        .from("books").select("book_id, title, price, discounted_price, stock_quantity, is_free_ship")
        .eq("book_id", item.book_id).maybeSingle();
      if (!book) return { ok: false, status: 404, detail: `Book with ID ${item.book_id} not found` };
      if ((book.stock_quantity ?? 0) < qty) {
        const err = shortStock("book", book.title);
        if (err) return err;
      }
      const price = book.discounted_price ?? book.price;
      totalAmount += price * qty;
      if (book.is_free_ship) hasFreeShip = true;
      items.push({ book_id: book.book_id, quantity: qty, price_at_purchase: price });
    } else if (item.stationery_id) {
      const { data: st } = await supabase
        .from("stationery").select("stationery_id, title, price, discounted_price, stock_quantity, is_free_ship")
        .eq("stationery_id", item.stationery_id).maybeSingle();
      if (!st) return { ok: false, status: 404, detail: `Stationery with ID ${item.stationery_id} not found` };
      if ((st.stock_quantity ?? 0) < qty) {
        const err = shortStock("stationery", st.title);
        if (err) return err;
      }
      const price = st.discounted_price ?? st.price;
      totalAmount += price * qty;
      if (st.is_free_ship) hasFreeShip = true;
      items.push({ stationery_id: st.stationery_id, quantity: qty, price_at_purchase: price });
    }
  }

  // Stationery passed via ghn_items (legacy frontend shape).
  for (const gi of body.ghn_items ?? []) {
    const sid = gi.stationery_id;
    const qty = Number(gi.quantity ?? 0);
    if (!sid || qty <= 0) continue;
    const { data: st } = await supabase
      .from("stationery").select("stationery_id, title, price, stock_quantity, is_free_ship")
      .eq("stationery_id", sid).maybeSingle();
    if (!st) return { ok: false, status: 404, detail: `Stationery with ID ${sid} not found` };
    if ((st.stock_quantity ?? 0) < qty) {
      const err = shortStock("stationery", st.title);
      if (err) return err;
    }
    const price = Number(gi.price ?? 0) || st.price;
    totalAmount += price * qty;
    if (st.is_free_ship) hasFreeShip = true;
    items.push({ stationery_id: sid, quantity: qty, price_at_purchase: price });
  }

  if (items.length === 0) return { ok: false, status: 400, detail: "No valid items in order" };

  // Shipping address: a signed-in customer may point at a saved address or ask
  // us to save a new one; a guest sends the fields inline.
  let ship: ShippingFields = {
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
      if (!addr) return { ok: false, status: 404, detail: "Shipping address not found" };
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

  return { ok: true, priced: { totalAmount, items, ship, hasFreeShip, stockWarnings } };
}

/**
 * Re-check stock for an already-priced basket, without re-pricing it.
 *
 * Used on the PayOS path, where pricing happened at checkout and insertion
 * happens minutes later at payment. The prices must stay the quoted ones, but
 * the shelves may have emptied in between — the caller records the order either
 * way (the money is already taken) and flags what came up short.
 */
export async function checkStock(
  supabase: SupabaseClient,
  items: OrderItemRow[],
): Promise<string[]> {
  const warnings: string[] = [];
  for (const row of items) {
    const table = row.book_id ? "books" : "stationery";
    const idCol = row.book_id ? "book_id" : "stationery_id";
    const id = row.book_id ?? row.stationery_id;
    const { data } = await supabase
      .from(table).select("title, stock_quantity").eq(idCol, id).maybeSingle();
    if (!data) {
      warnings.push(`${table} ${id} không còn tồn tại`);
    } else if (Number(data.stock_quantity ?? 0) < row.quantity) {
      warnings.push(`${data.title}: cần ${row.quantity}, còn ${data.stock_quantity ?? 0}`);
    }
  }
  return warnings;
}

export type InsertResult =
  | { ok: true; orderId: number }
  | { ok: false; status: number; detail: string };

interface InsertOpts {
  /** Extra columns to set on the row — the PayOS path lands its orders already Paid. */
  overrides?: Record<string, unknown>;
}

/** Write the order, its items and the stock decrements. */
export async function insertOrder(
  supabase: SupabaseClient,
  body: OrderCreateBody,
  priced: PricedOrder,
  appUserId: number | null,
  opts: InsertOpts = {},
): Promise<InsertResult> {
  const orderInsert: Record<string, unknown> = {
    user_id: appUserId,
    total_amount: priced.totalAmount,
    status: "Pending",
    payment_status: "Unpaid",
    guest_email: appUserId ? null : (body.guest_email ?? null),
    shipping_phone_number: priced.ship.phone,
    shipping_address_line1: priced.ship.line1,
    shipping_address_line2: priced.ship.line2,
    shipping_city: priced.ship.city,
    shipping_postal_code: priced.ship.postal,
    shipping_country: priced.ship.country,
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
    ...(opts.overrides ?? {}),
  };

  const { data: order, error: orderErr } = await supabase
    .from("orders").insert(orderInsert).select("order_id").single();
  if (orderErr || !order) {
    console.error("Order insert failed", orderErr);
    return { ok: false, status: 500, detail: "Failed to create order" };
  }
  const orderId = order.order_id as number;

  const { error: itemsErr } = await supabase
    .from("order_items").insert(priced.items.map((r) => ({ ...r, order_id: orderId })));
  if (itemsErr) {
    console.error("Order items insert failed; rolling back order", itemsErr);
    await supabase.from("orders").delete().eq("order_id", orderId);
    return { ok: false, status: 500, detail: "Failed to create order items" };
  }

  // Decrement stock (read-modify-write, matching the original semantics).
  for (const row of priced.items) {
    const table = row.book_id ? "books" : "stationery";
    const idCol = row.book_id ? "book_id" : "stationery_id";
    const id = row.book_id ?? row.stationery_id;
    const { data: current } = await supabase
      .from(table).select("stock_quantity").eq(idCol, id).maybeSingle();
    await supabase.from(table)
      .update({ stock_quantity: Math.max(0, Number(current?.stock_quantity ?? 0) - row.quantity) })
      .eq(idCol, id);
  }

  return { ok: true, orderId };
}
