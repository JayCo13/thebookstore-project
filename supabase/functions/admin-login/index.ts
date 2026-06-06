// Edge Function: admin-login
// Replaces FastAPI `POST /auth/admin/login`.
//
// Flow: blacklist → validate weekly code → sign in via Supabase Auth (password)
// → confirm Admin role → rotate code if near expiry → return the session.
//
// Request:  { email, password, login_code }
// Response: the Supabase session ({ access_token, refresh_token, ... }) plus the
//           app user. The frontend stores the session with supabase-js.
//
// Deploy with --no-verify-jwt (public endpoint; it does its own auth).
// Secrets: SUPABASE_* injected; MAIL_*/ADMIN_EMAIL for code rotation email.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { rotateIfNeeded, validateCode } from "../_shared/admin_code.ts";

const BLACKLIST = new Set(["thebookstore.vn@gmail.com", "the.bookstore.vn@gmail.com"]);

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let body: { email?: string; password?: string; login_code?: string };
  try {
    body = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !body.password || !body.login_code) {
    return json(req, { detail: "email, password và login_code là bắt buộc" }, 400);
  }

  if (BLACKLIST.has(email)) {
    return json(req, { detail: "Access denied. This email has been blocked for security reasons." }, 403);
  }

  const supabase = serviceClient();

  // Validate weekly code BEFORE password check (fail fast).
  if (!(await validateCode(supabase, body.login_code))) {
    return json(req, { detail: "Invalid or expired login code. Check your email for the current code." }, 401);
  }

  // Sign in with password via an anon client (returns a real user session).
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
    email, password: body.password,
  });
  if (signInErr || !signIn.session) {
    return json(req, { detail: "Incorrect email or password" }, 401);
  }

  // Confirm Admin role.
  const { data: appUser } = await supabase
    .from("users")
    .select("user_id, email, first_name, last_name, role:roles(role_name)")
    .eq("auth_id", signIn.user.id).maybeSingle();
  if (appUser?.role?.role_name !== "Admin") {
    return json(req, { detail: "Admin privileges required. Regular user accounts cannot access this area." }, 403);
  }

  // Rotate the code if it's near expiry (don't fail login on rotation error).
  try {
    await rotateIfNeeded(supabase);
  } catch (e) {
    console.error("Admin code rotation failed", e);
  }

  return json(req, {
    access_token: signIn.session.access_token,
    refresh_token: signIn.session.refresh_token,
    token_type: "bearer",
    expires_at: signIn.session.expires_at,
    user: appUser,
  });
});
