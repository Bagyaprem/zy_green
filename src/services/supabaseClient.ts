import { createClient } from '@supabase/supabase-js';
import { environment } from '@/config/environment';

/**
 * Real Supabase client for the ZYGREEN admin console.
 *
 * Reads `VITE_ADMIN_SUPABASE_URL` / `VITE_ADMIN_SUPABASE_ANON_KEY` (see
 * src/config/environment.ts). These are placeholder values until a real
 * Supabase project is provisioned for this admin app — every query below
 * will fail (network/auth error) until then, which every service call site
 * already handles via React Query's loading/error states. No fabricated
 * fallback data is returned on failure.
 */
export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/** Throws a friendly error for callers when Supabase hasn't been configured yet. */
export function assertSupabaseConfigured() {
  if (!environment.isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured yet. Set VITE_ADMIN_SUPABASE_URL and VITE_ADMIN_SUPABASE_ANON_KEY in .env to connect the admin console to a backend.'
    );
  }
}
