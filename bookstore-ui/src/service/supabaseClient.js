/**
 * Supabase client — the new backend client for the FastAPI → Supabase migration.
 *
 * Phase 6 plan (see ../../../supabase/MIGRATION.md): the named exports in
 * `api.js` get reimplemented on top of this client so page components keep their
 * imports. Plain reads/writes (catalog, profile, addresses, reviews, wishlist,
 * own orders) call `supabase.from(...)` directly under RLS; side-effecting flows
 * (create order, PayOS, chat, moderation, uploads) call Edge Functions via
 * `supabase.functions.invoke(...)`.
 *
 * Requires: npm install @supabase/supabase-js
 * Env (set in Netlify + .env): REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw at import time during the transition — api.js (FastAPI) is still
  // the live path until cutover. Warn so misconfiguration is visible.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY not set — ' +
      'Supabase calls will fail until configured (still on FastAPI backend).'
  );
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
