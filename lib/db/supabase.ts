import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/config/env";

/**
 * Server-side Supabase client using the service-role key.
 * NEVER import this into client components — it bypasses RLS.
 */
let _admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const env = supabaseEnv();
  if (!env.serviceRoleKey) {
    throw new Error(
      "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Fill it in .env.local " +
        "(server-only secret)."
    );
  }
  _admin = createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // Next.js (App Router) patches the global `fetch` and caches GETs by
      // default. supabase-js rides on that fetch, so reads can be served from a
      // stale cache — returning 0 rows even though the service-role key would
      // see them live. Force `no-store` so every DB read hits Postgres fresh.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return _admin;
}

/** True when Supabase is configured; lets routes degrade gracefully. */
export function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim() !== ""
  );
}
