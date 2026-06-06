// Admin rotating login code — ported from app/services/admin_code_service.py.
// 6-digit code, 7-day expiry, deactivate-old-on-rotate, emailed to admin.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { sendAdminCodeEmail } from "./email.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function gen6(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
  return String(n);
}

// The active, non-expired code row (or null).
export async function getCurrentCode(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("admin_login_codes")
    .select("*")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function validateCode(supabase: SupabaseClient, code: string): Promise<boolean> {
  if (!code || code.length !== 6) return false;
  const current = await getCurrentCode(supabase);
  return !!current && current.code === code;
}

// Deactivate all codes, insert a fresh one, email it. Returns the new code.
export async function generateWeeklyCode(supabase: SupabaseClient): Promise<string> {
  await supabase.from("admin_login_codes").update({ is_active: false }).eq("is_active", true);

  let code = gen6();
  // Ensure uniqueness against the unique `code` column.
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from("admin_login_codes").select("id").eq("code", code).maybeSingle();
    if (!clash) break;
    code = gen6();
  }

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
  await supabase.from("admin_login_codes").insert({
    code, expires_at: expiresAt.toISOString(), is_active: true,
  });
  await sendAdminCodeEmail(code, expiresAt);
  return code;
}

// Rotate if there is no active code or it expires within 24h. Returns true if rotated.
export async function rotateIfNeeded(supabase: SupabaseClient): Promise<boolean> {
  const current = await getCurrentCode(supabase);
  if (!current) { await generateWeeklyCode(supabase); return true; }
  const remaining = new Date(current.expires_at).getTime() - Date.now();
  if (remaining < ONE_DAY_MS) { await generateWeeklyCode(supabase); return true; }
  return false;
}
