// PayOS helpers ported from app/services/payos_service.py.
// PayOS signs both directions with HMAC-SHA256 keyed by the merchant checksum_key.

const enc = new TextEncoder();

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// PayOS webhook signing rule: None -> "", object/array -> compact JSON, else str.
function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

// Mirrors PayOSService.verify_webhook_signature — keys of `data` sorted
// alphabetically, joined k=v&k=v, HMAC compared in constant time.
export async function verifyWebhookSignature(body: {
  signature?: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  const checksumKey = Deno.env.get("PAYOS_CHECKSUM_KEY");
  const received = body.signature ?? "";
  const data = body.data ?? {};
  if (!checksumKey || !received || typeof data !== "object") return false;

  const message = Object.keys(data)
    .sort()
    .map((k) => `${k}=${stringify(data[k])}`)
    .join("&");
  const expected = await hmacSha256Hex(checksumKey, message);

  // constant-time-ish compare
  if (expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return diff === 0;
}

export async function createLinkSignature(payload: {
  amount: number; cancelUrl: string; description: string; orderCode: number; returnUrl: string;
}): Promise<string> {
  const checksumKey = Deno.env.get("PAYOS_CHECKSUM_KEY")!;
  const message =
    `amount=${payload.amount}&cancelUrl=${payload.cancelUrl}` +
    `&description=${payload.description}&orderCode=${payload.orderCode}` +
    `&returnUrl=${payload.returnUrl}`;
  return await hmacSha256Hex(checksumKey, message);
}

export function payosConfigured(): boolean {
  return Boolean(
    Deno.env.get("PAYOS_CLIENT_ID") &&
    Deno.env.get("PAYOS_API_KEY") &&
    Deno.env.get("PAYOS_CHECKSUM_KEY"),
  );
}

interface CreateLinkInput {
  orderCode: number;
  amount: number;
  description: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
}

// Ported from PayOSService.create_payment_link. Returns PayOS `data`
// ({ checkoutUrl, paymentLinkId, qrCode, ... }) or null.
export async function createPaymentLink(input: CreateLinkInput): Promise<Record<string, unknown> | null> {
  if (!payosConfigured()) {
    console.error("PayOS not configured");
    return null;
  }
  const base = (Deno.env.get("PAYOS_BASE_URL") ?? "https://api-merchant.payos.vn").replace(/\/$/, "");
  const returnUrl = Deno.env.get("PAYOS_RETURN_URL") ?? "";
  const cancelUrl = Deno.env.get("PAYOS_CANCEL_URL") ?? "";

  const payload: Record<string, unknown> = {
    orderCode: Math.trunc(input.orderCode),
    amount: Math.trunc(input.amount),
    description: (input.description ?? "").slice(0, 25),
    returnUrl,
    cancelUrl,
  };
  if (input.buyerName) payload.buyerName = input.buyerName.slice(0, 255);
  if (input.buyerEmail) payload.buyerEmail = input.buyerEmail;
  if (input.buyerPhone) payload.buyerPhone = input.buyerPhone;

  payload.signature = await createLinkSignature({
    amount: payload.amount as number,
    cancelUrl,
    description: payload.description as string,
    orderCode: payload.orderCode as number,
    returnUrl,
  });

  try {
    const resp = await fetch(`${base}/v2/payment-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": Deno.env.get("PAYOS_CLIENT_ID")!,
        "x-api-key": Deno.env.get("PAYOS_API_KEY")!,
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.error("PayOS create-link HTTP", resp.status, await resp.text());
      return null;
    }
    const body = await resp.json();
    if (body?.code !== "00") {
      console.error("PayOS create-link error", body?.code, body?.desc);
      return null;
    }
    return body?.data ?? null;
  } catch (e) {
    console.error("PayOS create-link request failed", e);
    return null;
  }
}
