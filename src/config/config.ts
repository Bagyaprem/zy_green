export const appConfig = {
  appName: 'ZYGREEN',
  appTagline: 'Industrial IoT Device Monitoring Console',
  companyName: 'ZYGREEN Technologies',
  supportEmail: 'support@zygreen.io',

  // Simulated network latency for mock services, in milliseconds.
  mockLatency: {
    fast: 250,
    normal: 500,
    slow: 900,
  },

  // Live-monitoring / sparkline refresh interval.
  liveRefreshIntervalMs: 4000,

  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50, 100],
  },

  dateFormat: 'dd MMM yyyy',
  dateTimeFormat: 'dd MMM yyyy, hh:mm a',
  timeFormat: 'hh:mm:ss a',
} as const;
