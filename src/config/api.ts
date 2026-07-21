import { environment } from './environment';

/**
 * API surface placeholders. Every service currently talks to `mock/` data
 * instead of these endpoints. When a real backend is available, point the
 * relevant service at these constants and remove the mock/latency shim.
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
