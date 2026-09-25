// Edge Function: goship-locations
// Serves the checkout form's province → district → ward dropdowns.
//
// WHY THIS EXISTS — the browser used to fetch these straight from the carrier:
//
//   Viettel Post served its address book unauthenticated, so the SPA called it
//   directly. GoShip requires a Bearer token on every endpoint, including
//   /cities. Shipping that token to the browser would put a credential that can
//   also BOOK SHIPMENTS into the JS bundle, which is exactly the mistake the GHN
//   integration made with its API token. So the lookup is proxied here instead.
//
// Request:  { type: "cities" }
//           { type: "districts", parent: "<city id>" }
//           { type: "wards",     parent: "<district id>" }
// Response: { places: [{ id, name }] }
//
// Called by guests as well as signed-in customers, so it runs under the normal
// JWT gate — the anon key satisfies it.
//
// Secrets: GOSHIP_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { getCities, getDistricts, getWards } from "../_shared/goship.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let body: { type?: string; parent?: string };
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }

  // service_role only so the token cache in integration_tokens is readable;
  // nothing here touches customer data.
  const supabase = serviceClient();
  const parent = String(body.parent ?? "").trim();

  try {
    switch (body.type) {
      case "cities":
        return json(req, { places: await getCities(supabase) });
      case "districts":
        if (!parent) return json(req, { detail: "parent (mã tỉnh/thành) là bắt buộc" }, 400);
        return json(req, { places: await getDistricts(parent, supabase) });
      case "wards":
        if (!parent) return json(req, { detail: "parent (mã quận/huyện) là bắt buộc" }, 400);
        return json(req, { places: await getWards(parent, supabase) });
      default:
        return json(req, { detail: 'type phải là "cities", "districts" hoặc "wards"' }, 400);
    }
  } catch (e) {
    // An empty dropdown is a dead checkout. Surface GoShip's own message rather
    // than a generic one: "Thông tin đăng nhập không chính xác" tells an admin
    // exactly what to fix, while "could not load addresses" sends them to the
    // logs — which, on a hosted project, they may not be able to read. GoShip's
    // errors describe the request, never the credentials, so this leaks nothing.
    const reason = e instanceof Error ? e.message : String(e);
    console.error("goship-locations failed:", reason);
    return json(req, { detail: `Không tải được danh sách địa chỉ: ${reason}`, places: [] }, 502);
  }
});
