// Order fulfillment — ported from app/services/order_fulfillment.py, now
// booking through GoShip instead of talking to a carrier directly.
//
// Both the COD create-order path and the PayOS webhook converge here:
//   1. Book a GoShip shipment (idempotent on orders.carrier_shipment_id).
//   2. Send the order email (customer confirmation + admin alert) — this
//      replaces the old Zalo ZNS notification.
//
// `forceCodZero` is the money-correctness lever: GoShip's `cod` is what the
// courier collects on delivery. For prepaid (PayOS) orders it MUST be 0.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createShipment } from "./goship.ts";
import {
  paymentLabel,
  sendNewOrderAdminEmail,
  sendOrderConfirmationEmail,
} from "./email.ts";

interface FulfillOpts {
  forceCodZero?: boolean;
}

export interface FulfillResult {
  /** GoShip's shipment id — null when the booking still could not be made. */
  shipmentId: string | null;
  /** The carrier's waybill, once assigned. Usually null right after booking. */
  trackingCode: string | null;
  shippingError: string | null;
  /** True when a later attempt could still succeed (transient failure). */
  retryable: boolean;
}

export async function fulfillOrder(
  supabase: SupabaseClient,
  orderId: number,
  opts: FulfillOpts = {},
): Promise<FulfillResult> {
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

  // What the courier collects:
  //   prepaid / forceCodZero       -> 0
  //   COD without free-ship        -> total + shipping_fee
  //   COD with a free-ship item    -> total only (the shop absorbs the freight)
  //
  // GoShip is always booked with payer = 1 (shop billed for the freight) and
  // nets the fee out of the COD, so the shop receives exactly `total_amount`
  // either way. Verified on the sandbox: cod 180400 − fee 30400 → 150000.
  const paid = (order.payment_status ?? "").toLowerCase() === "paid";
  let cod: number;
  if (opts.forceCodZero || paid) {
    cod = 0;
  } else {
    cod = Number(order.total_amount ?? 0);
    if (!hasFreeShip) cod += Number(order.shipping_fee ?? 0);
  }

  // 1) GoShip — idempotent on carrier_shipment_id.
  //
  // Whatever happens gets written back to the order. A failed booking used to
  // leave no trace anywhere except the function logs, so orders sat without a
  // shipment indefinitely and nobody could tell why (or even that they had).
  let shipmentId = order.carrier_shipment_id as string | null;
  let trackingCode = order.tracking_code as string | null;
  let shippingError: string | null = null;
  let retryable = false;

  // An order addressed for a previous carrier cannot be booked through GoShip:
  // GHN, VTP and GoShip all number provinces and districts differently, so the
  // same code means a different place to each. Only a PayOS basket parked
  // before a carrier switch can land in this state (see insertOrder); it keeps
  // the error the insert left on it and waits for an admin, rather than being
  // delivered somewhere arbitrary. The customer still gets their email below.
  const legacyAddress = !shipmentId && order.carrier && order.carrier !== "GOSHIP";
  if (legacyAddress) {
    shippingError = (order.shipping_error as string | null) ??
      `Đơn dùng mã vùng của ${order.carrier}, không tạo được vận đơn GoShip. Cần nhập lại địa chỉ.`;
    console.error(
      `Order ${orderId}: address is ${order.carrier}-coded, skipping GoShip booking — needs manual re-entry`,
    );
  }

  if (!shipmentId && !legacyAddress) {
    const city = String(order.ship_province_id ?? "").trim();
    const district = String(order.ship_district_id ?? "").trim();
    const ward = String(order.ship_ward_code ?? "").trim();

    const problems = [
      !city && "thiếu ship_province_id",
      !district && "thiếu ship_district_id",
      !ward && "thiếu ship_ward_code",
      !order.shipping_phone_number && "thiếu shipping_phone_number",
    ].filter(Boolean);

    if (problems.length) {
      const reason = `Thông tin giao hàng không hợp lệ: ${problems.join(", ")}`;
      shippingError = reason; // no retry will conjure up an address
      console.error(`Order ${orderId}: ${reason}; skipping GoShip booking`);
      await supabase.from("orders")
        .update({ shipping_error: reason, shipping_last_attempt_at: new Date().toISOString() })
        .eq("order_id", orderId);
    } else {
      const result = await createShipment(supabase, {
        orderId,
        toName: order.shipping_full_name ?? "Customer",
        toPhone: order.shipping_phone_number,
        toStreet: [order.shipping_address_line1, order.shipping_address_line2]
          .filter(Boolean).join(", "),
        toCity: city,
        toDistrict: district,
        toWard: ward,
        cod,
        // Declared value is the goods, never the COD — those differ whenever the
        // customer has already paid, and insurance should follow the goods.
        amount: Number(order.total_amount ?? 0),
        rateId: (order.shipping_rate_id as string | null) ?? null,
        items: lineItems,
      });

      shipmentId = result.shipmentId;
      trackingCode = result.trackingNumber ?? trackingCode;
      shippingError = result.error;
      retryable = result.retryable;

      await supabase.from("orders").update({
        ...(shipmentId ? { carrier_shipment_id: shipmentId } : {}),
        // The waybill usually arrives later, by webhook; only write a real one.
        ...(result.trackingNumber ? { tracking_code: result.trackingNumber } : {}),
        ...(result.trackingUrl ? { tracking_url: result.trackingUrl } : {}),
        ...(result.carrier ? { shipping_service_code: result.carrier } : {}),
        carrier: "GOSHIP",
        shipping_error: result.error,
        shipping_last_attempt_at: new Date().toISOString(),
      }).eq("order_id", orderId);

      if (shipmentId) {
        order.carrier_shipment_id = shipmentId;
        if (result.trackingNumber) order.tracking_code = result.trackingNumber;
        if (result.trackingUrl) order.tracking_url = result.trackingUrl;
      } else {
        console.error(
          `Order ${orderId} has no GoShip shipment: ${result.error}` +
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
    order.shipping_address_line1, order.ship_ward_name,
    order.ship_district_name, order.ship_province_name,
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
    trackingCode: (trackingCode as string | null) ?? "",
    trackingUrl: (order.tracking_url as string | null) ?? "",
    // With an aggregator the carrier is a per-order fact, not a constant.
    carrierName: (order.shipping_service_code as string | null) ?? "",
    items: lineItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
  };

  await Promise.allSettled([
    sendOrderConfirmationEmail(emailData),
    sendNewOrderAdminEmail(emailData),
  ]);

  // Callers that can retry (the PayOS webhook) need to know whether the booking
  // actually happened, and whether trying again is worth anything.
  return { shipmentId, trackingCode, shippingError, retryable };
}
