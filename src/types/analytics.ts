export interface TrendPoint {
  timestamp: string;
  value: number;
}

export interface AnalyticsSummary {
  average: number;
  min: number;
  max: number;
  current: number;
  unit: string;
}

export interface HistoryRow {
  id: string;
  deviceId: string;
  timestamp: string;
  aqi: number;
  pm25: number;
  pm10: number;
  co2: number;
  temperature: number;
  humidity: number;
  tvoc: number;
  pressure: number;
}

export interface DashboardKpis {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  disconnectedDevices: number;
  maintenanceDevices: number;
  activeAlerts: number;
  totalCustomers: number;
  totalUsers: number;
  avgDeviceHealth: number;
}

export interface DeviceStatusBreakdown {
  status: string;
  count: number;
  color: string;
}
