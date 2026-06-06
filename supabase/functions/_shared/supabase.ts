// Supabase client factories for Edge Functions.
//
//   serviceClient() — bypasses RLS (SUPABASE_SERVICE_ROLE_KEY). Use for
//     server-side flows the old FastAPI routers owned: order creation, webhooks,
//     fulfillment, admin code issuance. Treat as fully trusted.
//
//   userClient(req) — forwards the caller's Authorization header so RLS applies
//     as that user. Use when a function needs to act *as* the signed-in user
//     and respect their permissions.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
