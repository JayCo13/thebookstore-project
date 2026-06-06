// Shared CORS handling for Edge Functions. The old FastAPI app used
// CORSMiddleware driven by settings.allowed_origins; here we echo the same set.
// Tighten `ALLOWED_ORIGINS` (comma-separated) via function secrets in prod.

const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim().replace(/^["']|["']$/g, "")) // strip stray quotes from the secret
  .filter(Boolean);

function isLocalhost(origin: string | null): boolean {
  return !!origin && /^https?:\/\/localhost(:\d+)?$/.test(origin);
}

export function corsHeaders(origin: string | null): HeadersInit {
  // Reflect the request origin when it's allowed (needed so the browser accepts
  // the response); always permit localhost for dev; else fall back to the first
  // configured origin.
  let allowOrigin;
  if (allowed.includes("*")) allowOrigin = origin || "*";
  else if (origin && allowed.includes(origin)) allowOrigin = origin;
  else if (isLocalhost(origin)) allowOrigin = origin;
  else allowOrigin = allowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

// Standard preflight + JSON response helpers.
export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }
  return null;
}

export function json(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req.headers.get("origin")),
      "Content-Type": "application/json",
    },
  });
}
