// GoShip (goship.io) integration — the carrier layer, replacing Viettel Post.
//
// GoShip is an AGGREGATOR: one API in front of ~14 Vietnamese carriers (GHN,
// GHTK, J&T, Ninja Van, VNPost, VTP…). `POST /rates` returns what each will
// charge for a route and `POST /shipments` books one of those quotes. Switching
// carrier is now a runtime choice, not a code change — which is the whole point
// of moving here after GHN and then VTP both disappointed.
//
// Everything below was verified against the sandbox before it was written. The
// five things the documentation gets wrong or omits, in the order they would
// have cost time:
//
//  1. THE TOKEN LASTS 15 DAYS, not "approximately 10 years" as the docs claim.
//     Measured: expires_in = 1296000. So the cache-and-refresh dance is real;
//     it lives in public.integration_tokens because edge isolates are stateless.
//
//  2. THE RESPONSE ENVELOPE IS NOT UNIFORM. Most endpoints nest the payload
//     under `data`. `POST /shipments` puts the shipment's fields at the ROOT and
//     sends `data: []`. `unwrap()` handles both.
//
//  3. `tracking_number` COMES BACK AS THE STRING "NULL" when the carrier has
//     not assigned one yet (status 900). Printed straight into an email, the
//     customer gets a waybill number reading "NULL".
//
//  4. THERE ARE TWO IDENTIFIERS. `id` (e.g. "GSLP2VV596") is GoShip's own and
//     is what cancel and the webhook's `gcode` use; `tracking_number` is the
//     carrier's, assigned later. We store both — see `carrier_shipment_id`.
//
//  5. IDS ARE MIXED TYPES INSIDE ONE ADDRESS: city and district are strings
//     ("700000", "701200"), ward is a number (9075).
//
// Unlike VTP, GoShip uses real HTTP status codes (422 with per-field Vietnamese
// messages, 401 when unauthenticated), so `resp.ok` means something here.
//
// Secrets: GOSHIP_BASE_URL, GOSHIP_USERNAME, GOSHIP_PASSWORD, GOSHIP_CLIENT_ID,
//          GOSHIP_CLIENT_SECRET (or GOSHIP_TOKEN to pin one from the portal),
//          GOSHIP_SENDER_* (pickup address).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const RAW_BASE = (Deno.env.get("GOSHIP_BASE_URL") ?? "https://api.goship.io/api/v2").replace(/\/$/, "");
export const API_BASE = RAW_BASE.endsWith("/api/v2") ? RAW_BASE : `${RAW_BASE}/api/v2`;

const USERNAME = Deno.env.get("GOSHIP_USERNAME") ?? "";
const PASSWORD = Deno.env.get("GOSHIP_PASSWORD") ?? "";
const CLIENT_ID = Deno.env.get("GOSHIP_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("GOSHIP_CLIENT_SECRET") ?? "";
/**
 * Escape hatch: an access token copied straight from the portal's API
 * Connections page, skipping the login call entirely. Useful because a
 * production developer account is NOT activated by default — GoShip support has
 * to enable it — while the portal will hand out a token before that happens.
 * A pinned token never refreshes, so drop this once login works.
 */
const STATIC_TOKEN = Deno.env.get("GOSHIP_TOKEN") ?? "";

const TOKEN_ROW = "goship";

/** Shop pickup address, in GoShip's own codes. */
const SENDER = {
  name: Deno.env.get("GOSHIP_SENDER_NAME") ?? "Tâm Nguồn Book",
  phone: Deno.env.get("GOSHIP_SENDER_PHONE") ?? "",
  street: Deno.env.get("GOSHIP_SENDER_STREET") ?? "",
  ward: Deno.env.get("GOSHIP_SENDER_WARD") ?? "",
  district: Deno.env.get("GOSHIP_SENDER_DISTRICT") ?? "",
  city: Deno.env.get("GOSHIP_SENDER_CITY") ?? "",
};

export function goshipConfigured(): boolean {
  const credentialed = STATIC_TOKEN || (USERNAME && PASSWORD && CLIENT_ID && CLIENT_SECRET);
  return Boolean(credentialed && SENDER.city && SENDER.district && SENDER.ward);
}

/** Ties a GoShip shipment back to an order; travels as `order_id`. */
export function orderRef(orderId: number): string {
  return `BK${orderId}`;
}

/** "BK42" -> 42. Null for anything else. */
export function parseOrderRef(reference: string): number | null {
  const m = /^BK(\d+)$/i.exec(String(reference ?? "").trim());
  return m ? Number(m[1]) : null;
}

// ── errors ──────────────────────────────────────────────────────────────────

export class GoshipError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly status?: number) {
    super(message);
    this.name = "GoshipError";
  }
}

/**
 * Flatten GoShip's validation errors into one readable line.
 *
 * A 422 body looks like {"shipment.address_to.ward":["Thiếu thông tin phường/xã
 * người nhận"]} or {"code":422,"data":{"errors":[...]}}. Both shapes carry text
 * an admin can act on, so neither should be reduced to "HTTP 422".
 */
function describeError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;

    const nested = (b.data as Record<string, unknown> | undefined)?.errors;
    if (Array.isArray(nested) && nested.length) return nested.map(String).join("; ");

    const parts: string[] = [];
    for (const [k, v] of Object.entries(b)) {
      if (["code", "status", "message", "data"].includes(k)) continue;
      if (Array.isArray(v)) parts.push(`${k}: ${v.map(String).join(", ")}`);
    }
    if (parts.length) return parts.join("; ");

    if (typeof b.message === "string" && b.message) return b.message;
  }
  return `HTTP ${status}`;
}

// ── token ───────────────────────────────────────────────────────────────────

/** Per-isolate cache, so a warm function does not re-read the database. */
let memoToken: { token: string; expiresAt: number } | null = null;

async function login(): Promise<{ token: string; expiresAt: number }> {
  const resp = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      username: USERNAME, password: PASSWORD,
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await resp.json().catch(() => null);
  const data = (body?.data ?? body) as Record<string, unknown> | null;
  const token = (data?.access_token ?? body?.access_token) as string | undefined;

  if (!resp.ok || !token) {
    throw new GoshipError(
      `GoShip đăng nhập thất bại: ${describeError(body, resp.status)}`,
      resp.status >= 500,
      resp.status,
    );
  }

  // Measured at 1296000s (15 days). Refresh a day early so a token cannot
  // expire between the quote and the booking.
  const ttl = Number(data?.expires_in ?? body?.expires_in ?? 0) || 15 * 86_400;
  return { token, expiresAt: Date.now() + Math.max(60_000, (ttl - 86_400) * 1000) };
}

export async function getToken(supabase?: SupabaseClient, forceRefresh = false): Promise<string> {
  if (STATIC_TOKEN) return STATIC_TOKEN;
  if (!USERNAME || !PASSWORD || !CLIENT_ID || !CLIENT_SECRET) {
    throw new GoshipError("GoShip chưa được cấu hình (thiếu GOSHIP_USERNAME/PASSWORD/CLIENT_ID/CLIENT_SECRET)", false);
  }

  const now = Date.now();
  if (!forceRefresh && memoToken && memoToken.expiresAt > now) return memoToken.token;

  if (!forceRefresh && supabase) {
    const { data: row } = await supabase
      .from("integration_tokens").select("token, expires_at").eq("name", TOKEN_ROW).maybeSingle();
    if (row?.token) {
      const exp = row.expires_at ? Date.parse(row.expires_at as string) : 0;
      if (exp > now) {
        memoToken = { token: row.token as string, expiresAt: exp };
        return row.token as string;
      }
    }
  }

  const { token, expiresAt } = await login();
  memoToken = { token, expiresAt };

  if (supabase) {
    const { error } = await supabase.from("integration_tokens").upsert({
      name: TOKEN_ROW,
      token,
      expires_at: new Date(expiresAt).toISOString(),
      updated_at: new Date().toISOString(),
    });
    // A cache-write failure is not a call failure — we still hold a good token.
    if (error) console.error("GoShip: could not cache token", error);
  }

  return token;
}

// ── request plumbing ────────────────────────────────────────────────────────

interface CallOpts {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number>;
  supabase?: SupabaseClient;
  timeoutMs?: number;
}

/**
 * Return the payload, whichever shape it arrived in.
 *
 * `{code, status, data: [...] }` for most endpoints, but `POST /shipments`
 * answers `{code, status, data: [], id, tracking_number, cod, fee, …}` with the
 * shipment at the root. Preferring a non-empty `data` and falling back to the
 * body itself covers both without guessing per endpoint.
 */
function unwrap(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const b = body as Record<string, unknown>;
  if (!("data" in b)) return b;
  const d = b.data;
  if (Array.isArray(d) && d.length === 0) return b; // shipment-at-root case
  return d;
}

async function call(path: string, opts: CallOpts = {}): Promise<unknown> {
  const { method = "GET", body, query, supabase, timeoutMs = 60_000 } = opts;

  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));

  const send = async (token: string): Promise<Response> =>
    await fetch(url.toString(), {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

  let resp: Response;
  try {
    resp = await send(await getToken(supabase));
    // The one failure worth retrying silently: a token that expired early.
    if (resp.status === 401) resp = await send(await getToken(supabase, true));
  } catch (e) {
    if (e instanceof GoshipError) throw e;
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new GoshipError(
      timedOut
        ? `GoShip không phản hồi trong ${timeoutMs / 1000}s`
        : `Lỗi kết nối GoShip: ${e instanceof Error ? e.message : String(e)}`,
      true,
    );
  }

  const payload = await resp.json().catch(() => null);

  if (!resp.ok) {
    // 5xx and 429 are worth another attempt; a 4xx is a verdict on the request.
    const retryable = resp.status >= 500 || resp.status === 429;
    throw new GoshipError(`GoShip từ chối: ${describeError(payload, resp.status)}`, retryable, resp.status);
  }

  return unwrap(payload);
}

// ── address book ────────────────────────────────────────────────────────────
//
// Three tiers, same shape the checkout form already renders. Note the id types
// are NOT consistent: city and district are strings, ward is a number. They are
// exposed as strings here so callers never have to remember which is which; the
// request builders send them back exactly as received.

export interface GoshipPlace { id: string; name: string }

function toPlaces(rows: unknown): GoshipPlace[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
    .map((r) => ({ id: String(r.id ?? ""), name: String(r.name ?? "") }))
    .filter((p) => p.id && p.name);
}

export async function getCities(supabase?: SupabaseClient): Promise<GoshipPlace[]> {
  return toPlaces(await call("/cities", { query: { size: 100 }, supabase }));
}

export async function getDistricts(cityId: string, supabase?: SupabaseClient): Promise<GoshipPlace[]> {
  return toPlaces(await call(`/cities/${encodeURIComponent(cityId)}/districts`, { query: { size: 100 }, supabase }));
}

export async function getWards(districtId: string, supabase?: SupabaseClient): Promise<GoshipPlace[]> {
  return toPlaces(await call(`/districts/${encodeURIComponent(districtId)}/wards`, { query: { size: 100 }, supabase }));
}

// ── name lookup ─────────────────────────────────────────────────────────────
//
// The chatbot is handed a free-text address ("giao về Thủ Đức") and has to turn
// it into the codes the rate endpoint wants. Matching ignores accents because
// people type "thu duc" as often as "Thủ Đức", and ignores the administrative
// prefix because GoShip spells names "Quận 12" while customers write "quan 12".

function normalize(text: unknown): string {
  if (text == null) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .split(/\s+/)
    .join(" ");
}

function stripPrefix(name: string): string {
  return name.replace(/^(thanh pho|tinh|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, "").trim();
}

function bestMatch(list: GoshipPlace[], query: string): GoshipPlace | null {
  const qn = normalize(query);
  if (!qn) return null;

  // Substring either way first: the query is usually a whole sentence, so the
  // place name is contained in it rather than the other way round.
  for (const item of list) {
    const n = normalize(item.name);
    if (!n) continue;
    if (qn.includes(n) || n.includes(qn)) return item;
    const bare = stripPrefix(n);
    if (bare && bare.length > 2 && qn.includes(bare)) return item;
  }

  // Otherwise whichever candidate shares the most words with the query.
  const tokens = new Set(qn.split(" "));
  let best: GoshipPlace | null = null;
  let bestScore = 0;
  for (const item of list) {
    const nameTokens = new Set(normalize(item.name).split(" "));
    let score = 0;
    for (const t of tokens) if (nameTokens.has(t)) score++;
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return best;
}

export async function findCity(query: string, supabase?: SupabaseClient): Promise<GoshipPlace | null> {
  try { return bestMatch(await getCities(supabase), query); }
  catch (e) { console.error("GoShip findCity failed", e); return null; }
}

export async function findDistrict(cityId: string, query: string, supabase?: SupabaseClient): Promise<GoshipPlace | null> {
  try { return bestMatch(await getDistricts(cityId, supabase), query); }
  catch (e) { console.error("GoShip findDistrict failed", e); return null; }
}

export async function findWard(districtId: string, query: string, supabase?: SupabaseClient): Promise<GoshipPlace | null> {
  try { return bestMatch(await getWards(districtId, supabase), query); }
  catch (e) { console.error("GoShip findWard failed", e); return null; }
}

// ── rates ───────────────────────────────────────────────────────────────────

export interface GoshipRate {
  /** Opaque handle passed straight back to `createShipment`. */
  id: string;
  carrier: string;
  carrierCode: string;
  service: string;
  expected: string;
  fee: number;
}

export interface RateParams {
  toCity: string;
  toDistrict: string;
  weight?: number;
  length?: number; width?: number; height?: number;
  /** Declared value, for insurance. */
  amount?: number;
  /** What the courier collects on delivery. */
  cod?: number;
}

/**
 * Every carrier that will take this parcel, cheapest first.
 *
 * `rate.id` is a base64 of stable internal ids ("MTJfMTdfMTU2Mw==" decodes to
 * "12_17_1563"), not a session token — so it is safe to quote at checkout and
 * book minutes later, which is exactly what the PayOS flow needs.
 */
export async function getRates(params: RateParams, supabase?: SupabaseClient): Promise<GoshipRate[]> {
  if (!SENDER.city || !SENDER.district) {
    console.error("GoShip: sender origin not configured (GOSHIP_SENDER_CITY/DISTRICT)");
    return [];
  }

  const payload = {
    shipment: {
      address_from: { city: SENDER.city, district: SENDER.district },
      address_to: { city: params.toCity, district: params.toDistrict },
      parcel: {
        cod: Math.max(0, Math.round(params.cod ?? 0)),
        amount: Math.max(0, Math.round(params.amount ?? 0)),
        weight: Math.max(1, Math.round(params.weight ?? 500)),
        width: Math.max(1, Math.round(params.width ?? 15)),
        height: Math.max(1, Math.round(params.height ?? 10)),
        length: Math.max(1, Math.round(params.length ?? 20)),
      },
    },
  };

  try {
    const data = await call("/rates", { method: "POST", body: payload, supabase });
    if (!Array.isArray(data)) return [];
    return data
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      .map((r) => ({
        id: String(r.id ?? ""),
        carrier: String(r.carrier_name ?? ""),
        carrierCode: String(r.carrier_short_name ?? ""),
        service: String(r.service ?? ""),
        expected: String(r.expected ?? ""),
        fee: Number(r.total_fee ?? 0),
      }))
      .filter((r) => r.id)
      .sort((a, b) => a.fee - b.fee);
  } catch (e) {
    console.error("GoShip rates failed", e instanceof Error ? e.message : e);
    return [];
  }
}

// ── phone ───────────────────────────────────────────────────────────────────
//
// Carried through from the GHN and VTP clients: a malformed recipient phone is
// the most common reason a shipment is refused, and carriers behind GoShip
// validate it just the same.

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

// ── create shipment ─────────────────────────────────────────────────────────

export interface GoshipLineItem {
  name: string; quantity: number; price: number;
  length: number; width: number; height: number; weight: number;
}

export interface GoshipOrderInput {
  orderId: number;
  toName: string; toPhone: string; toStreet: string;
  toCity: string; toDistrict: string; toWard: string;
  /** What the courier collects. 0 for anything already paid. */
  cod: number;
  /** Declared value of the goods, for insurance. */
  amount: number;
  /** The quote to book. Falls back to re-quoting when absent or stale. */
  rateId: string | null;
  items: GoshipLineItem[];
  note?: string;
}

export interface GoshipSubmitResult {
  /** GoShip's own shipment id — used to cancel, and matched by the webhook. */
  shipmentId: string | null;
  /** The carrier's waybill, if assigned yet. Usually null at creation (status 900). */
  trackingNumber: string | null;
  /** Public tracking page, once there is a waybill to track. */
  trackingUrl: string | null;
  carrier: string | null;
  fee: number | null;
  error: string | null;
  retryable: boolean;
}

/** GoShip reports "no waybill yet" as the literal string "NULL". */
function realTrackingNumber(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || s.toUpperCase() === "NULL") return null;
  return s;
}

const MAX_ATTEMPTS = 3;

/**
 * Book a shipment. The caller persists the result.
 *
 * `payer: 1` means the shop is billed for the freight and GoShip nets it out of
 * the COD. Verified on the sandbox: cod 180400 − fee 30400 → amount_return_shop
 * 150000, exactly the merchandise value. `payer: 0` bills the recipient instead,
 * which would charge a COD customer for shipping twice, since `cod` already
 * includes it.
 */
export async function createShipment(
  supabase: SupabaseClient | undefined,
  input: GoshipOrderInput,
): Promise<GoshipSubmitResult> {
  const fail = (error: string, retryable = false): GoshipSubmitResult =>
    ({ shipmentId: null, trackingNumber: null, trackingUrl: null, carrier: null, fee: null, error, retryable });

  if (!goshipConfigured()) {
    console.error("GoShip not configured");
    return fail("GoShip chưa được cấu hình (thiếu GOSHIP_* hoặc địa chỉ kho gửi)");
  }

  const toPhone = normalizeVnPhone(input.toPhone);
  if (!isValidVnPhone(toPhone)) {
    // Still attempt it — the carrier is the authority — but say so loudly,
    // because this failure used to be indistinguishable from any other.
    console.error(
      `GoShip: recipient phone "${input.toPhone}" is not a valid VN number ` +
      `(expected 0[35789]xxxxxxxx or 02xxxxxxxxx); the carrier will likely refuse it`,
    );
  }

  const dim = (v: number, fallback: number) => Math.max(1, Math.round(v) || fallback);
  const totalWeight = Math.max(
    input.items.reduce((s, i) => s + dim(i.weight, 300) * i.quantity, 0),
    100,
  );
  const maxLength = input.items.length ? Math.max(...input.items.map((i) => dim(i.length, 20))) : 20;
  const maxWidth = input.items.length ? Math.max(...input.items.map((i) => dim(i.width, 15))) : 15;
  const maxHeight = input.items.length ? Math.max(...input.items.map((i) => dim(i.height, 10))) : 10;

  const cod = Math.max(0, Math.round(input.cod));
  const amount = Math.max(0, Math.round(input.amount));

  // A quote is needed to book. Re-quote when checkout did not record one, or
  // when the recorded one is no longer offered for this route.
  let rateId = input.rateId;
  if (!rateId) {
    const rates = await getRates({
      toCity: input.toCity, toDistrict: input.toDistrict,
      weight: totalWeight, length: maxLength, width: maxWidth, height: maxHeight,
      amount, cod,
    }, supabase);
    if (rates.length === 0) {
      return fail("Không có hãng vận chuyển nào phục vụ tuyến này");
    }
    rateId = rates[0].id;
    console.log(`GoShip: order ${input.orderId} had no rate, re-quoted -> ${rates[0].carrierCode} ${rates[0].fee}`);
  }

  const payload = {
    shipment: {
      rate: rateId,
      payer: 1,
      order_id: orderRef(input.orderId),
      is_recall: 0,
      address_from: {
        name: SENDER.name, phone: SENDER.phone, street: SENDER.street,
        ward: SENDER.ward, district: SENDER.district, city: SENDER.city,
      },
      address_to: {
        name: input.toName, phone: toPhone, street: input.toStreet,
        ward: input.toWard, district: input.toDistrict, city: input.toCity,
      },
      parcel: {
        cod,
        amount,
        weight: String(totalWeight),
        width: String(maxWidth),
        height: String(maxHeight),
        length: String(maxLength),
        metadata: (input.note ?? `Đơn hàng #${input.orderId} - Tâm Nguồn Book`).slice(0, 255),
      },
    },
  };

  let lastError = "Không gọi được GoShip";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const data = await call("/shipments", { method: "POST", body: payload, supabase }) as Record<string, unknown>;

      const shipmentId = String(data?.id ?? "").trim() || null;
      if (!shipmentId) {
        lastError = "GoShip trả về thành công nhưng không có mã đơn";
      } else {
        // `carrier_error` carries the downstream carrier's complaint even when
        // GoShip itself answered 200 — an empty one is the only real success.
        const carrierError = String(data?.carrier_error ?? "").trim();
        if (carrierError) {
          console.error(`GoShip: shipment ${shipmentId} created with carrier_error: ${carrierError}`);
        }
        const norm = normalizeShipment(data);
        return {
          shipmentId,
          trackingNumber: norm.trackingNumber,
          trackingUrl: norm.trackingUrl,
          carrier: norm.carrier,
          fee: norm.fee,
          error: carrierError || null,
          retryable: false,
        };
      }
    } catch (e) {
      if (e instanceof GoshipError) {
        lastError = e.message;
        if (!e.retryable) {
          console.error("GoShip create rejected", e.message);
          return fail(lastError);
        }
      } else {
        lastError = `Lỗi không xác định khi gọi GoShip: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    console.error(`GoShip create attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }

  return fail(lastError, true);
}

// ── lookup / cancel ─────────────────────────────────────────────────────────
//
// There is NO `GET /shipments/{id}` — it answers 405. Shipments are read from
// the list endpoint, which accepts `?order_id=`, and that happens to be the best
// possible key: it is our own reference, so a shipment can be found even when
// the create call never got to tell us GoShip's id.
//
// The list and the create response also name the same fields differently
// (`status_code` vs `shipment_status`, `total_fee` vs `fee`, `carrier_name` vs
// `carrier`). `normalizeShipment` is the single place that knows this.

export interface GoshipShipment {
  id: string;
  orderRef: string | null;
  statusCode: number | null;
  statusText: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  fee: number | null;
  /** What GoShip will pay out to the shop: cod minus fees. */
  amountReturnShop: number | null;
  isReturn: boolean;
  isLost: boolean;
}

export function normalizeShipment(row: Record<string, unknown>): GoshipShipment {
  const num = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: String(row.id ?? ""),
    orderRef: (row.order_id as string | undefined) ?? null,
    statusCode: num(row.status_code ?? row.shipment_status),
    statusText: (row.status_text ?? row.shipment_status_txt ?? null) as string | null,
    trackingNumber: realTrackingNumber(row.tracking_number ?? row.carrier_code),
    // The url embeds the waybill, so it is just as useless while that reads "NULL".
    trackingUrl: realTrackingNumber(row.tracking_number ?? row.carrier_code)
      ? ((row.tracking_url as string | undefined) ?? null)
      : null,
    carrier: (row.carrier_name ?? row.carrier ?? null) as string | null,
    fee: num(row.total_fee ?? row.fee),
    amountReturnShop: num(row.amount_return_shop),
    isReturn: Number(row.is_return ?? 0) === 1,
    isLost: Number(row.is_lost ?? 0) === 1,
  };
}

/** Find a shipment by OUR order id. Returns null when GoShip has none. */
export async function findShipmentByOrder(
  supabase: SupabaseClient | undefined,
  orderId: number,
): Promise<GoshipShipment | null> {
  try {
    const d = await call("/shipments", { query: { order_id: orderRef(orderId) }, supabase });
    const rows = Array.isArray(d) ? d : [];
    const row = rows[0] as Record<string, unknown> | undefined;
    return row ? normalizeShipment(row) : null;
  } catch (e) {
    console.error("GoShip lookup failed", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * One page of the shop's shipments.
 *
 * The batch status sync uses this instead of asking about each order in turn:
 * GoShip only lists shipments that are still in flight, so a single page covers
 * exactly the orders whose status can still change.
 */
export async function listShipments(
  supabase: SupabaseClient | undefined,
  page = 1,
  size = 100,
): Promise<GoshipShipment[]> {
  try {
    const d = await call("/shipments", { query: { size, page }, supabase });
    if (!Array.isArray(d)) return [];
    return d
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      .map(normalizeShipment)
      .filter((s) => s.id);
  } catch (e) {
    console.error("GoShip list failed", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Cancel a shipment. Only possible before the carrier collects it. */
export async function cancelShipment(
  supabase: SupabaseClient | undefined,
  shipmentId: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await call(`/shipments/${encodeURIComponent(shipmentId)}`, { method: "DELETE", supabase });
    return { ok: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`GoShip cancel failed for ${shipmentId}: ${msg}`);
    return { ok: false, error: msg };
  }
}

// ── status ──────────────────────────────────────────────────────────────────
//
// GoShip's codes are documented (900–919, 1000) — unlike VTP's, which had to be
// reverse-engineered. They are mapped onto the lowercase English vocabulary the
// admin panel and the customer's order list already render, so orders from all
// three carriers this shop has used still display through one table.
//
// Codes with no faithful equivalent map to null: the order keeps its previous
// status and the event is still recorded, rather than being forced into a label
// that means something else.

const STATUS_BY_CODE: Record<number, string> = {
  900: "ready_to_pick",   // Đơn mới — saved, not yet sent to the carrier
  901: "ready_to_pick",   // Chờ lấy hàng
  902: "picking",         // Lấy hàng — courier on the way to collect
  903: "picked",          // Đã lấy hàng
  904: "delivering",      // Giao hàng
  905: "delivered",       // Giao thành công
  906: "delivery_fail",   // Giao thất bại
  907: "returning",       // Đang chuyển hoàn
  908: "returned",        // Chuyển hoàn
  909: "delivered",       // Đã đối soát — accounting after a successful delivery
  910: "delivered",       // Đã đối soát khách
  911: "delivered",       // Đã trả COD cho khách
  912: "delivered",       // Chờ thanh toán COD
  913: "delivered",       // Hoàn thành
  914: "cancel",          // Đơn hủy
  // 915 Chậm lấy/giao and 916 Giao hàng một phần describe a delay and a partial
  // delivery. Neither is a state this UI has a word for, and guessing would
  // either hide a problem or claim a delivery that only half happened.
  917: "lost",            // Thất lạc hàng
  918: "storing",         // Đang lưu kho
  919: "transporting",    // Đang vận chuyển
  1000: "exception",      // Đơn lỗi
};

/** Statuses that end the shipment — no later push should move them. */
export const TERMINAL_STATUS_CODES = new Set([905, 908, 913, 914, 917, 1000]);

export function mapGoshipStatus(code: number): string | null {
  return STATUS_BY_CODE[code] ?? null;
}

// ── webhook ─────────────────────────────────────────────────────────────────

/**
 * Verify the `x-goship-hmac-sha256` header over the raw request body.
 *
 * GoShip documents only that the digest covers "your credentials and the data
 * Goship sends", without pinning the construction, so both the hex and base64
 * encodings of HMAC-SHA256(body, client_secret) are accepted. The comparison is
 * constant-time, and a mismatch logs the two digests truncated so the first real
 * push tells us immediately if the construction differs.
 */
export async function verifyWebhookSignature(rawBody: string, received: string): Promise<boolean> {
  if (!CLIENT_SECRET || !received) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CLIENT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );

  const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  const b64 = btoa(String.fromCharCode(...sig));

  const got = received.trim();
  if (timingSafeEqual(got, hex) || timingSafeEqual(got, b64)) return true;

  console.error(
    `GoShip webhook signature mismatch: received ${got.slice(0, 16)}…, ` +
    `expected hex ${hex.slice(0, 16)}… or base64 ${b64.slice(0, 16)}…`,
  );
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** GoShip stamps updates in Unix seconds, GMT+7. */
export function parseGoshipTime(raw: unknown): Date | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n > 1e12 ? n : n * 1000);
  return Number.isNaN(d.getTime()) ? null : d;
}
