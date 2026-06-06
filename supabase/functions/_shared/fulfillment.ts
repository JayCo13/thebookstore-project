// Order fulfillment — ported from app/services/order_fulfillment.py.
//
// Both the COD create-order path and the PayOS webhook converge here:
//   1. Submit a GHN shipping order (idempotent on orders.ghn_order_code).
//   2. Send the order email (customer confirmation + admin alert) — this
//      replaces the old Zalo ZNS notification.
//
// `forceCodZero` is the money-correctness lever: GHN cod_amount is what the
// courier collects on delivery. For prepaid (PayOS) orders it MUST be 0.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { submitGhnOrder } from "./ghn.ts";
import {
  paymentLabel,
  sendNewOrderAdminEmail,
  sendOrderConfirmationEmail,
} from "./email.ts";

interface FulfillOpts {
  forceCodZero?: boolean;
}

export async function fulfillOrder(
  supabase: SupabaseClient,
  orderId: number,
  opts: FulfillOpts = {},
): Promise<void> {
  const { data: order } = await supabase
    .from("orders").select("*").eq("order_id", orderId).single();
  if (!order) throw new Error(`Order ${orderId} not found`);

  // Pull items with their book/stationery for names, dimensions, free-ship flag.
  const { data: items } = await supabase
    .from("order_items")
    .select(`
      quantity, price_at_purchase,
      book:books ( title, length, width, height, weight, is_free_ship ),
      stationery:stationery ( title, length, width, height, weight, is_free_ship )
    `)
    .eq("order_id", orderId);

  const lineItems = (items ?? []).map((it) => {
    const p = it.book ?? it.stationery;
    return {
      name: p?.title ?? "Item",
      quantity: it.quantity,
      price: Number(it.price_at_purchase),
      length: Number(p?.length ?? 20),
      width: Number(p?.width ?? 15),
      height: Number(p?.height ?? 10),
      weight: Number(p?.weight ?? 300),
    };
  });
  const hasFreeShip = (items ?? []).some(
    (it) => it.book?.is_free_ship || it.stationery?.is_free_ship,
  );

  // cod_amount:
  //   prepaid / forceCodZero       -> 0
  //   COD without free-ship        -> total + shipping_fee
  //   COD with a free-ship item    -> total only
  const paid = (order.payment_status ?? "").toLowerCase() === "paid";
  let codAmount: number;
  if (opts.forceCodZero || paid) {
    codAmount = 0;
  } else {
    codAmount = Number(order.total_amount ?? 0);
    if (!hasFreeShip) codAmount += Number(order.shipping_fee ?? 0);
  }

  // 1) GHN — idempotent on ghn_order_code.
  let ghnCode = order.ghn_order_code as string | null;
  if (!ghnCode) {
    if (!order.ghn_ward_code || !order.ghn_district_id || !order.shipping_phone_number) {
      console.error(`Order ${orderId} missing GHN address fields; skipping submit`);
    } else {
      ghnCode = await submitGhnOrder({
        toName: order.shipping_full_name ?? "Customer",
        toPhone: order.shipping_phone_number,
        toAddress: [order.shipping_address_line1, order.shipping_address_line2]
          .filter(Boolean).join(", "),
        toWardCode: order.ghn_ward_code,
        toDistrictId: order.ghn_district_id,
        codAmount,
        serviceId: order.shipping_service_id ?? 0,
        items: lineItems,
        hasFreeShip,
      });
      if (ghnCode) {
        await supabase.from("orders").update({ ghn_order_code: ghnCode }).eq("order_id", orderId);
        order.ghn_order_code = ghnCode;
      }
    }
  }

  // 2) Email notification — replaces the old Zalo ZNS. Sent to the customer
  //    (confirmation) and to the admin (new-order alert). Stable: no tokens.
  //    Resolve the customer email: guest_email, else the registered user's email.
  let customerEmail = (order.guest_email as string | null) ?? "";
  if (!customerEmail && order.user_id) {
    const { data: u } = await supabase
      .from("users").select("email").eq("user_id", order.user_id).maybeSingle();
    customerEmail = u?.email ?? "";
  }

  const address = [
    order.shipping_address_line1, order.ghn_ward_name,
    order.ghn_district_name, order.ghn_province_name,
  ].filter(Boolean).join(", ");

  const emailData = {
    orderId: order.order_id as number,
    customerName: (order.shipping_full_name as string | null) ?? "Khách hàng",
    customerPhone: (order.shipping_phone_number as string | null) ?? "",
    customerEmail,
    address,
    totalAmount: Number(order.total_amount ?? 0),
    // Free-ship items: the customer isn't charged shipping, so show 0.
    shippingFee: hasFreeShip ? 0 : Number(order.shipping_fee ?? 0),
    paymentLabel: paymentLabel(order),
    ghnCode: (ghnCode as string | null) ?? "",
    items: lineItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
  };

  await Promise.allSettled([
    sendOrderConfirmationEmail(emailData),
    sendNewOrderAdminEmail(emailData),
  ]);
}
