/**
 * Central place to read environment/runtime variables.
 * Nothing here is consumed yet (the app runs entirely on mock services),
 * but it is wired up so a future swap to real backends only touches
 * `services/`, `config/`, and this file.
 */

export type AppEnv = 'development' | 'staging' | 'production';

export const environment = {
  mode: (import.meta.env.MODE as AppEnv) ?? 'development',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  // Supabase (future data layer)
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',

  // Generic REST API (future data layer)
  apiUrl: import.meta.env.VITE_API_URL ?? '',

  // Realtime device telemetry broker (future data layer)
  mqttUrl: import.meta.env.VITE_MQTT_URL ?? '',

  // Outbound mail relay for alerts/invitations (future data layer)
  smtpUrl: import.meta.env.VITE_SMTP_URL ?? '',
} as const;
