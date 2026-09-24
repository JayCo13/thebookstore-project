// Edge Function: goship-shipping-fee
// Quotes a basket: every carrier GoShip will route it through, cheapest first.
//
// The `rate` id on each option is what books that exact quote later, so it is
// returned to the browser and travels back with the order. That is what makes
// the customer pay the price they were shown — the alternative, re-quoting at
// fulfilment, can come back different once the basket or the route is re-priced.
//
// Keeping this server-side also keeps the shop's pickup origin and the GoShip
// credentials off the client.
//
// Request:  { city, district, weight?, length?, width?, height?, amount?, cod? }
// Response: { services: [{ rate, carrier, carrier_code, service, expected, fee }],
//             cheapest: {…} | null }
//
// Secrets: GOSHIP_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { getRates } from "../_shared/goship.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }

  const city = String(body.city ?? "").trim();
  const district = String(body.district ?? "").trim();
  if (!city || !district) {
    return json(req, { detail: "city và district là bắt buộc" }, 400);
  }

  const rates = await getRates({
    toCity: city,
    toDistrict: district,
    weight: Number(body.weight ?? 500),
    length: Number(body.length ?? 20),
    width: Number(body.width ?? 15),
    height: Number(body.height ?? 10),
    amount: Number(body.amount ?? 0),
    cod: Number(body.cod ?? 0),
  }, serviceClient());

  const services = rates.map((r) => ({
    rate: r.id,
    carrier: r.carrier,
    carrier_code: r.carrierCode,
    service: r.service,
    expected: r.expected,
    fee: r.fee,
  }));

  if (services.length === 0) {
    // An empty list is a real answer ("nobody serves this route") at least as
    // often as it is a failure, so answer 200 and let checkout say so, rather
    // than a 500 the page would render as a crash.
    return json(req, {
      services: [],
      cheapest: null,
      detail: "Chưa có đơn vị vận chuyển nào phục vụ tuyến giao này",
    });
  }

  return json(req, { services, cheapest: services[0] });
});
