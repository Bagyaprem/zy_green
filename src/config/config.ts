export const appConfig = {
  appName: 'ZYGREEN',
  appTagline: 'Industrial IoT Device Monitoring Console',
  companyName: 'ZYGREEN Technologies',
  supportEmail: 'support@zygreen.io',

  // Live-monitoring / sparkline refresh interval (real Supabase poll cadence).
  liveRefreshIntervalMs: 4000,

  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50, 100],
  },

  dateFormat: 'dd MMM yyyy',
  dateTimeFormat: 'dd MMM yyyy, hh:mm a',
  timeFormat: 'hh:mm:ss a',
} as const;
