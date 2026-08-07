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
/**
 * One-time cleanup of pre-sessionStorage sessions. Anyone signed in before
 * the switch below still has a Supabase auth token in localStorage that this
 * client no longer reads — so it would sit there indefinitely, a valid
 * refresh token that nothing in the app can see or expire. Drop it.
 */
try {
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      window.localStorage.removeItem(key);
    }
  }
} catch {
  // localStorage blocked (private mode / cookies disabled) — nothing to clean.
}

export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    /**
     * Per-tab sessions. Supabase defaults to localStorage, which is shared
     * across every tab on the origin — so signing out (or in) in one tab
     * fired a storage event that propagated to all the others, making it
     * impossible to be logged in as an admin and a customer side by side.
     *
     * sessionStorage is scoped to a single tab, so each one holds its own
     * independent session and they no longer interfere.
     *
     * Tradeoff, deliberate: a session no longer survives closing the tab,
     * and a brand-new tab starts logged out. For a console showing customer
     * data that's a reasonable security posture (nothing lingers after the
     * tab is gone), but it does mean no "stay signed in across restarts".
     */
    storage: window.sessionStorage,
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

/**
 * Supabase's `auth.signUp()` also signs the browser in as the new user,
 * which would kick the admin out of their own session if called on the
 * shared `supabase` client above. This creates a throwaway client with no
 * persisted session — used only to create a customer's login account — so
 * the admin's own session is untouched.
 */
export function createThrowawayAuthClient() {
  return createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
