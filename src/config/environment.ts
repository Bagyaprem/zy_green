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

export const environment = {
  mode: (import.meta.env.MODE as AppEnv) ?? 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  // Supabase — admin console data layer. Placeholder values only; see README/.env.example.
  supabaseUrl: import.meta.env.VITE_ADMIN_SUPABASE_URL || DUMMY_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY || DUMMY_SUPABASE_ANON_KEY,
  isSupabaseConfigured: Boolean(
    import.meta.env.VITE_ADMIN_SUPABASE_URL && import.meta.env.VITE_ADMIN_SUPABASE_ANON_KEY
  ),

  // Generic REST API (future data layer)
  apiUrl: import.meta.env.VITE_API_URL ?? '',

  // Realtime device telemetry broker (future data layer)
  mqttUrl: import.meta.env.VITE_MQTT_URL ?? '',

  // Outbound mail relay for alerts/invitations (future data layer)
  smtpUrl: import.meta.env.VITE_SMTP_URL ?? '',
} as const;
