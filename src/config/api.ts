import { environment } from './environment';

/**
 * API surface placeholders for a future generic REST/MQTT/SMTP backend.
 * The primary data layer today is Supabase (see src/services/supabaseClient.ts
 * and supabase_admin_schema.sql) — these constants are kept for endpoints
 * that don't map to a Supabase table/RPC directly.
 */
export const apiConfig = {
  baseUrl: environment.apiUrl,
  timeoutMs: 15000,
  endpoints: {
    devices: '/devices',
    customers: '/customers',
    users: '/users',
    alerts: '/alerts',
    analytics: '/analytics',
    reports: '/reports',
    firmware: '/firmware',
    wifi: '/wifi',
    activityLogs: '/activity-logs',
    notifications: '/notifications',
    settings: '/settings',
    auth: '/auth',
  },
  mqtt: {
    url: environment.mqttUrl,
  },
  smtp: {
    url: environment.smtpUrl,
  },
  supabase: {
    url: environment.supabaseUrl,
    anonKey: environment.supabaseAnonKey,
  },
} as const;
