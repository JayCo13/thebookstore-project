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
  //
  // Whatever happens here gets written back to the order. A failed submit used
  // to leave no trace anywhere except the function logs, so orders sat without
  // a waybill indefinitely and nobody could tell why (or even that they had).
  let ghnCode = order.ghn_order_code as string | null;
  if (!ghnCode) {
    const missing = [
      !order.ghn_ward_code && "ghn_ward_code",
      !order.ghn_district_id && "ghn_district_id",
      !order.shipping_phone_number && "shipping_phone_number",
    ].filter(Boolean);

    if (missing.length) {
      const reason = `Thiếu thông tin giao hàng: ${missing.join(", ")}`;
      console.error(`Order ${orderId}: ${reason}; skipping GHN submit`);
      await supabase.from("orders")
        .update({ ghn_error: reason, ghn_last_attempt_at: new Date().toISOString() })
        .eq("order_id", orderId);
    } else {
      const result = await submitGhnOrder({
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
      ghnCode = result.orderCode;

      await supabase.from("orders").update({
        ...(ghnCode ? { ghn_order_code: ghnCode } : {}),
        ghn_error: result.error,
        ghn_last_attempt_at: new Date().toISOString(),
      }).eq("order_id", orderId);

      if (ghnCode) {
        order.ghn_order_code = ghnCode;
      } else {
        console.error(
          `Order ${orderId} has no GHN waybill: ${result.error}` +
          (result.retryable ? " (transient — safe to retry)" : " (needs the data fixed first)"),
        );
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
