// GHN (Giao Hàng Nhanh) integration — ported from app/services/ghn_service.py.
//
// Endpoints all live under {base}/shiip/public-api/. The old Python code mixed
// `{base}/master-data/...` and `{base}/shiip/public-api/v2/...`; that only worked
// because the create path was the one actually exercised. Here every call uses
// the correct `/shiip/public-api` prefix.
//
// Secrets: GHN_API_TOKEN, GHN_SHOP_ID, GHN_BASE_URL (default online-gateway).
//
// Shop origin (from_*) is hardcoded exactly as in the Python service.

const RAW_BASE = (Deno.env.get("GHN_BASE_URL") ?? "https://online-gateway.ghn.vn").replace(/\/$/, "");
// Normalise so we always hit /shiip/public-api regardless of how the env is set.
const API_BASE = RAW_BASE.endsWith("/shiip/public-api") ? RAW_BASE : `${RAW_BASE}/shiip/public-api`;
const TOKEN = Deno.env.get("GHN_API_TOKEN") ?? "";
const SHOP_ID = Deno.env.get("GHN_SHOP_ID") ?? "";

export function ghnConfigured(): boolean {
  return Boolean(TOKEN && SHOP_ID);
}

function headers(withShop = true): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json", "Token": TOKEN };
  if (withShop) h["ShopId"] = SHOP_ID;
  return h;
}

// ── accent-insensitive matching (mirrors _normalize / _strip_accents) ───────
function normalize(text: unknown): string {
  if (text == null) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .trim()
    .split(/\s+/)
    .join(" ");
}

function nameMatches(candidate: Record<string, unknown>, qn: string, nameKey: string): boolean {
  const name = normalize(candidate[nameKey] ?? "");
  if (name.includes(qn) || qn.includes(name)) return true;
  const exts = (candidate.NameExtension ?? candidate.name_extension ?? []) as string[];
  for (const ext of exts) {
    const en = normalize(ext);
    if (en.includes(qn) || qn.includes(en)) return true;
  }
  return false;
}

function bestTokenOverlap(list: Record<string, unknown>[], qn: string, nameKey: string): Record<string, unknown> | null {
  const tokens = new Set(qn.split(" "));
  let best: Record<string, unknown> | null = null;
  let bestScore = 0;
  for (const item of list) {
    const nameTokens = new Set(normalize(item[nameKey]).split(" "));
    let score = 0;
    for (const t of tokens) if (nameTokens.has(t)) score++;
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return best;
}

// ── master data ─────────────────────────────────────────────────────────────
export async function getProvinces(): Promise<Record<string, unknown>[]> {
  if (!ghnConfigured()) return [];
  try {
    const resp = await fetch(`${API_BASE}/master-data/province`, { headers: headers(false) });
    if (!resp.ok) { console.error("GHN provinces failed", resp.status); return []; }
    return (await resp.json())?.data ?? [];
  } catch (e) { console.error("GHN provinces error", e); return []; }
}

export async function getDistricts(provinceId: number): Promise<Record<string, unknown>[]> {
  if (!ghnConfigured()) return [];
  try {
    const resp = await fetch(`${API_BASE}/master-data/district`, {
      method: "POST", headers: headers(false), body: JSON.stringify({ province_id: provinceId }),
    });
    if (!resp.ok) { console.error("GHN districts failed", resp.status); return []; }
    return (await resp.json())?.data ?? [];
  } catch (e) { console.error("GHN districts error", e); return []; }
}

export async function getWards(districtId: number): Promise<Record<string, unknown>[]> {
  if (!ghnConfigured()) return [];
  try {
    const resp = await fetch(`${API_BASE}/master-data/ward`, {
      method: "POST", headers: headers(false), body: JSON.stringify({ district_id: districtId }),
    });
    if (!resp.ok) { console.error("GHN wards failed", resp.status); return []; }
    return (await resp.json())?.data ?? [];
  } catch (e) { console.error("GHN wards error", e); return []; }
}

export async function findProvince(nameQuery: string): Promise<Record<string, unknown> | null> {
  const provinces = await getProvinces();
  if (!provinces.length) return null;
  const qn = normalize(nameQuery);
  for (const p of provinces) if (nameMatches(p, qn, "ProvinceName")) return p;
  return bestTokenOverlap(provinces, qn, "ProvinceName");
}

export async function findDistrict(provinceId: number, nameQuery: string): Promise<Record<string, unknown> | null> {
  const districts = await getDistricts(provinceId);
  if (!districts.length) return null;
  const qn = normalize(nameQuery);
  for (const d of districts) if (nameMatches(d, qn, "DistrictName")) return d;
  return bestTokenOverlap(districts, qn, "DistrictName");
}

export async function findWard(districtId: number, nameQuery: string): Promise<Record<string, unknown> | null> {
  const wards = await getWards(districtId);
  if (!wards.length) return null;
  const qn = normalize(nameQuery);
  for (const w of wards) if (nameMatches(w, qn, "WardName")) return w;
  return bestTokenOverlap(wards, qn, "WardName");
}

// ── shipping fee (used by the chatbot) ──────────────────────────────────────
export interface FeeParams {
  to_district_id: number;
  to_ward_code: string;
  service_type_id?: number;
  weight?: number; length?: number; width?: number; height?: number;
  insurance_value?: number;
}

export async function calculateShippingFee(params: FeeParams): Promise<Record<string, unknown> | null> {
  if (!ghnConfigured() || !params.to_district_id || !params.to_ward_code) return null;
  const payload = {
    service_type_id: params.service_type_id ?? 2,
    to_district_id: params.to_district_id,
    to_ward_code: params.to_ward_code,
    weight: params.weight ?? 500,
    length: params.length ?? 20,
    width: params.width ?? 15,
    height: params.height ?? 10,
    insurance_value: params.insurance_value ?? 0,
    coupon: null,
  };
  try {
    const resp = await fetch(`${API_BASE}/v2/shipping-order/fee`, {
      method: "POST", headers: headers(true), body: JSON.stringify(payload),
    });
    if (!resp.ok) { console.error("GHN fee failed", resp.status, await resp.text()); return null; }
    const data = await resp.json();
    if (data?.code === 200 && data?.data) return data.data;
    console.error("GHN fee error", JSON.stringify(data).slice(0, 300));
    return null;
  } catch (e) { console.error("GHN fee error", e); return null; }
}

// ── order detail (status sync) ──────────────────────────────────────────────
export async function getOrderDetail(orderCode: string): Promise<Record<string, unknown> | null> {
  if (!ghnConfigured() || !orderCode) return null;
  try {
    const resp = await fetch(`${API_BASE}/v2/shipping-order/detail`, {
      method: "POST", headers: headers(true), body: JSON.stringify({ order_code: String(orderCode) }),
    });
    if (!resp.ok) { console.error("GHN detail failed", resp.status); return null; }
    const data = await resp.json();
    if (data?.code === 200) return data.data ?? {};
    console.error("GHN detail error", JSON.stringify(data).slice(0, 300));
    return null;
  } catch (e) { console.error("GHN detail error", e); return null; }
}

// ── create shipping order ───────────────────────────────────────────────────
export interface GhnLineItem {
  name: string; quantity: number; price: number;
  length: number; width: number; height: number; weight: number;
}
export interface GhnOrderInput {
  toName: string; toPhone: string; toAddress: string;
  toWardCode: string; toDistrictId: number;
  codAmount: number; serviceId: number;
  items: GhnLineItem[]; hasFreeShip: boolean;
}

// GHN validates the recipient phone server-side (`master_data_validate_phone`)
// and 400s the whole shipping order when it doesn't like it. Accepted: mobile
// `0[35789]` + 8 digits, or landline `02` + 9 digits. Orders placed before the
// checkout form enforced this — and any caller that isn't the checkout form —
// can still carry "+84 912 345 678" style input, so coerce to the local 0 form
// here rather than handing GHN something it will reject over formatting alone.
function normalizeVnPhone(raw: string): string {
  let digits = String(raw ?? "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("840")) digits = digits.slice(2);
  else if (digits.startsWith("84")) digits = "0" + digits.slice(2);
  return digits;
}

function isValidVnPhone(p: string): boolean {
  return /^0[35789]\d{8}$/.test(p) || /^02\d{9}$/.test(p);
}

export interface GhnSubmitResult {
  /** GHN waybill code, or null when GHN refused / never answered. */
  orderCode: string | null;
  /** Why it failed, in a form worth showing an admin. Null on success. */
  error: string | null;
  /** True when retrying later could plausibly succeed (network/5xx/timeout). */
  retryable: boolean;
}

const CREATE_TIMEOUT_MS = 30_000; // matches the old Python client's timeout
const MAX_ATTEMPTS = 3;

/**
 * Submit the shipping order to GHN. Caller persists the result.
 *
 * Retries transient failures (network error, timeout, 5xx, GHN code >= 500).
 * A 400 from GHN is a verdict on the payload — bad phone, bad ward — so
 * retrying it just burns time and hides the real reason; those return
 * immediately with `retryable: false`.
 *
 * Order #25 is why this exists: valid data, GHN accepted the identical payload
 * on replay a day later, but the one live call failed and the order was left
 * without a waybill forever because nothing retried and nothing recorded it.
 */
export async function submitGhnOrder(input: GhnOrderInput): Promise<GhnSubmitResult> {
  if (!ghnConfigured()) {
    console.error("GHN not configured");
    return { orderCode: null, error: "GHN chưa được cấu hình (thiếu GHN_API_TOKEN/GHN_SHOP_ID)", retryable: false };
  }

  const toPhone = normalizeVnPhone(input.toPhone);
  if (!isValidVnPhone(toPhone)) {
    // Still attempt the call (GHN is the authority on what it accepts), but say
    // so loudly — this is the single most common reason an order never gets a
    // waybill, and it used to be indistinguishable from any other failure.
    console.error(
      `GHN: recipient phone "${input.toPhone}" is not a valid VN number ` +
      `(expected 0[35789]xxxxxxxx or 02xxxxxxxxx); GHN will likely reject this order`,
    );
  }

  // payment_type_id: free-ship or prepaid (cod 0) → 1 (shop pays); COD → 2.
  const paymentTypeId = input.hasFreeShip ? 1 : (input.codAmount > 0 ? 2 : 1);

  // GHN's create API rejects non-integer length/width/height/weight (the old
  // Python service cast every dimension with int()). Book/stationery rows can
  // carry decimal cm (e.g. 15.50, 23.50), so round here or GHN returns 400 and
  // the order silently ends up with no shipping label.
  const dim = (v: number, fallback: number) => Math.max(1, Math.round(v) || fallback);
  const items = input.items.map((i) => ({
    name: i.name, quantity: i.quantity, price: Math.round(i.price),
    length: dim(i.length, 20), width: dim(i.width, 15), height: dim(i.height, 10), weight: dim(i.weight, 300),
  }));
  const totalWeight = Math.max(items.reduce((s, i) => s + i.weight * i.quantity, 0), 300);
  const maxLength = items.length ? Math.max(...items.map((i) => i.length)) : 20;
  const maxWidth = items.length ? Math.max(...items.map((i) => i.width)) : 15;
  const maxHeight = items.length ? Math.max(...items.map((i) => i.height)) : 10;

  const payload = {
    payment_type_id: paymentTypeId,
    note: "TheBookStore",
    required_note: "CHOXEMHANGKHONGTHU",
    from_name: "TheBookStore",
    from_phone: "0987654321",
    from_address: "35/6 đường TTH15 Tổ 30 KP3A, Quận 12, Thành phố Hồ Chí Minh, Việt Nam",
    from_ward_name: "Tân Thới Hiệp",
    from_district_name: "Quận 12",
    from_province_name: "HCM",
    to_name: input.toName,
    to_phone: toPhone,
    to_address: input.toAddress,
    to_ward_code: input.toWardCode,
    to_district_id: input.toDistrictId,
    cod_amount: Math.round(input.codAmount),
    weight: totalWeight,
    length: maxLength,
    width: maxWidth,
    height: maxHeight,
    service_id: input.serviceId || 0,
    service_type_id: 2,
    items,
  };

  let lastError = "Không gọi được GHN";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(`${API_BASE}/v2/shipping-order/create`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
      });
      const body = await resp.json().catch(() => null);

      if (resp.ok && body?.code === 200) {
        const code = body?.data?.order_code ?? null;
        if (code) return { orderCode: code, error: null, retryable: false };
        lastError = "GHN trả về 200 nhưng không có order_code";
      } else {
        // GHN puts the useful text in `message`; keep it verbatim so an admin
        // can act on it ("số điện thoại … không đúng" is self-explanatory).
        const msg = body?.message ?? `HTTP ${resp.status}`;
        lastError = `GHN từ chối: ${msg}`;
        const transient = resp.status >= 500 || (typeof body?.code === "number" && body.code >= 500);
        if (!transient) {
          console.error("GHN create rejected", resp.status, JSON.stringify(body).slice(0, 500));
          return { orderCode: null, error: lastError, retryable: false };
        }
      }
    } catch (e) {
      lastError = e instanceof Error && e.name === "TimeoutError"
        ? `GHN không phản hồi trong ${CREATE_TIMEOUT_MS / 1000}s`
        : `Lỗi kết nối GHN: ${e instanceof Error ? e.message : String(e)}`;
    }

    console.error(`GHN create attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1000 * attempt)); // 1s, then 2s
    }
  }

  return { orderCode: null, error: lastError, retryable: true };
}
