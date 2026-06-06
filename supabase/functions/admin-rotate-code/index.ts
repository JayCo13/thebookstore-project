// Edge Function: admin-rotate-code
// Replaces the FastAPI `admin_code_rotation_scheduler` background loop +
// `initialize_admin_code`. Invoked on a pg_cron schedule (e.g. hourly) — it
// generates a new weekly admin login code when the current one is missing or
// within 24h of expiry, deactivates the old one, and emails the new code.
//
// Protect this endpoint: require the service_role key (deploy with default JWT
// verification OFF and gate on a shared secret, OR invoke it from pg_cron with
// the service_role key in the Authorization header).
//
// Suggested pg_cron (see supabase/MIGRATION.md):
//   select cron.schedule('admin-code-rotate','0 * * * *', $$
//     select net.http_post(
//       url := '<project>/functions/v1/admin-rotate-code',
//       headers := jsonb_build_object('Authorization','Bearer <service_role_key>')
//     ); $$);
import { json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { getCurrentCode, rotateIfNeeded } from "../_shared/admin_code.ts";

Deno.serve(async (req) => {
  // Gate: accept EITHER a custom shared secret header (preferred — avoids any
  // Authorization-header gateway interference + key-format ambiguity) OR the
  // service_role bearer. Set ADMIN_ROTATE_SECRET via `supabase secrets set`.
  const rotateSecret = Deno.env.get("ADMIN_ROTATE_SECRET");
  const headerSecret = req.headers.get("x-admin-secret") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const okBySecret = !!rotateSecret && headerSecret === rotateSecret;
  const okByBearer = !!serviceKey && auth === `Bearer ${serviceKey}`;
  if (!okBySecret && !okByBearer) return json(req, { detail: "Forbidden" }, 403);

  const supabase = serviceClient();
  const before = await getCurrentCode(supabase);
  const rotated = await rotateIfNeeded(supabase);
  return json(req, { rotated, had_active_code: !!before });
});
