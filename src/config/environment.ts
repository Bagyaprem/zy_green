/**
 * Central place to read environment/runtime variables.
 *
 * IMPORTANT: this admin console is a separate application from the legacy
 * customer dashboard that used to live in this repo, so it intentionally
 * reads DIFFERENT env var names (`VITE_ADMIN_SUPABASE_*`) instead of the
 * pre-existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` pair already
 * sitting in `.env` for the old app. That avoids silently inheriting real
 * production credentials. Until real `VITE_ADMIN_SUPABASE_*` values are
 * provided, obviously-fake placeholders are used so the app boots and every
 * Supabase call fails gracefully (handled by each page's loading/error/empty
 * states) instead of crashing on a missing config.
 */

export type AppEnv = 'development' | 'staging' | 'production';

const DUMMY_SUPABASE_URL = 'https://your-project.supabase.co';
const DUMMY_SUPABASE_ANON_KEY = 'your-anon-key-here';

// Checks against the known dummy values too, not just presence — an env var
// accidentally set to the placeholder text (rather than left unset) must
// still count as "not configured", or the app tries to really call a
// nonexistent https://your-project.supabase.co and fails with a confusing
// network error instead of using the dev login.
const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_ADMIN_SUPABASE_URL &&
    import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_ADMIN_SUPABASE_URL !== DUMMY_SUPABASE_URL &&
    import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY !== DUMMY_SUPABASE_ANON_KEY
);

export const environment = {
  mode: (import.meta.env.MODE as AppEnv) ?? 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  // Supabase — admin console data layer. Placeholder values only; see README/.env.example.
  supabaseUrl: import.meta.env.VITE_ADMIN_SUPABASE_URL || DUMMY_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY || DUMMY_SUPABASE_ANON_KEY,
  isSupabaseConfigured,

  /**
   * The hardcoded dev-login bypass in authService may ONLY ever be reachable
   * in a local dev build. It used to be gated on `!isSupabaseConfigured`
   * alone, which meant a production deploy that was merely *missing* its env
   * vars (e.g. Vercel, where .env is gitignored and must be re-entered by
   * hand) silently turned into an open door: the login page printed the
   * fixed credentials on screen with a click-to-fill button, and they granted
   * full admin (customerId: null) to anyone who loaded the public URL.
   * Failing closed here means a misconfigured deploy is merely broken —
   * which is loud and fixable — instead of quietly wide open.
   */
  isDevLoginEnabled: import.meta.env.DEV && !isSupabaseConfigured,

  // Generic REST API (future data layer)
  apiUrl: import.meta.env.VITE_API_URL ?? '',

  // Realtime device telemetry broker (future data layer)
  mqttUrl: import.meta.env.VITE_MQTT_URL ?? '',

  // Outbound mail relay for alerts/invitations (future data layer)
  smtpUrl: import.meta.env.VITE_SMTP_URL ?? '',
} as const;
