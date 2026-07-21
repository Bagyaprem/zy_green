import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { alertService } from './alertService';
import type {
  AnalyticsSummary,
  DashboardKpis,
  Device,
  DeviceStatusBreakdown,
  HistoryRow,
  SensorMeta,
  SensorParameter,
  ThresholdSetting,
  TrendPoint,
} from '@/types';
import { rangeFromTimeFilter, summarize } from '@/utils/timeseries';
import { DEVICE_STATUS_CHART_COLORS } from '@/constants/statusColors';
import { SENSOR_META, SENSOR_READING_COLUMN } from '@/constants/sensorMeta';
import { deviceService } from './deviceService';

type TimeRange = '1H' | '24H' | '7D' | '30D' | 'CUSTOM';

interface ReadingRow {
  recorded_at: string;
  [column: string]: string | number | null;
}

async function fetchReadings(deviceId: string, column: string, from: Date, to: Date): Promise<TrendPoint[]> {
  const { data, error } = await supabase
    .from('device_readings')
    .select(`recorded_at, ${column}`)
    .eq('device_id', deviceId)
    .gte('recorded_at', from.toISOString())
    .lte('recorded_at', to.toISOString())
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data as unknown as ReadingRow[]).map((row) => ({
    timestamp: row.recorded_at,
    value: Number(row[column] ?? 0),
  }));
}

export const analyticsService = {
  async getSensorMeta(): Promise<SensorMeta[]> {
    // Static UI display config (label/unit/color/icon), not backend data — see src/constants/sensorMeta.ts.
    return SENSOR_META;
  },

  async getDefaultThresholds(): Promise<ThresholdSetting[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('thresholds').select('*');
    if (error) throw error;
    return (data ?? []).map((row) => ({ parameter: row.parameter, unit: row.unit ?? '', warning: row.warning, danger: row.danger }));
  },

  async getDashboardKpis(): Promise<DashboardKpis> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('dashboard_kpis').select('*').single();
    if (error) throw error;
    return {
      totalDevices: data.total_devices ?? 0,
      onlineDevices: data.online_devices ?? 0,
      offlineDevices: data.offline_devices ?? 0,
      disconnectedDevices: data.disconnected_devices ?? 0,
      maintenanceDevices: data.maintenance_devices ?? 0,
      activeAlerts: data.active_alerts ?? 0,
      totalCustomers: data.total_customers ?? 0,
      totalUsers: data.total_users ?? 0,
      avgDeviceHealth: data.avg_device_health ?? 0,
    };
  },

  async getDeviceStatusBreakdown(): Promise<DeviceStatusBreakdown[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.rpc('get_device_status_breakdown');
    if (error) throw error;
    const byStatus = new Map((data ?? []).map((row: { status: string; count: number }) => [row.status, row.count]));
    const statuses: Device['status'][] = ['Online', 'Offline', 'Maintenance', 'Disconnected'];
    return statuses.map((status) => ({
      status,
      count: Number(byStatus.get(status) ?? 0),
      color: DEVICE_STATUS_CHART_COLORS[status],
    }));
  },

  async getTrend(deviceId: string, parameter: SensorParameter, timeRange: TimeRange, custom?: { from: string; to: string }): Promise<TrendPoint[]> {
    assertSupabaseConfigured();
    if (!deviceId) return [];
    const { from, to } = rangeFromTimeFilter(timeRange, custom);
    const column = SENSOR_READING_COLUMN[parameter];
    return fetchReadings(deviceId, column, from, to);
  },

  async getSummary(
    deviceId: string,
    parameter: SensorParameter,
    timeRange: TimeRange,
    custom?: { from: string; to: string }
  ): Promise<AnalyticsSummary> {
    const meta = SENSOR_META.find((m) => m.key === parameter);
    const series = await this.getTrend(deviceId, parameter, timeRange, custom);
    return summarize(series, meta?.unit ?? '');
  },

  async getHistory(deviceId: string, from: string, to: string): Promise<HistoryRow[]> {
    assertSupabaseConfigured();
    if (!deviceId) return [];
    const { data, error } = await supabase
      .from('device_readings')
      .select('*')
      .eq('device_id', deviceId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      deviceId: row.device_id,
      timestamp: row.recorded_at,
      aqi: row.aqi ?? 0,
      pm25: row.pm25 ?? 0,
      pm10: row.pm10 ?? 0,
      co2: row.co2 ?? 0,
      temperature: row.temperature ?? 0,
      humidity: row.humidity ?? 0,
      tvoc: row.tvoc ?? 0,
      pressure: row.pressure ?? 0,
    }));
  },

  async getTopDevices(limit = 5): Promise<Device[]> {
    return deviceService.getDevicesSortedByHealth(limit);
  },

  /** Fleet-wide average trend for the dashboard overview chart, averaged across real per-device readings. */
  async getFleetTrend(parameter: SensorParameter, timeRange: TimeRange, custom?: { from: string; to: string }): Promise<TrendPoint[]> {
    assertSupabaseConfigured();
    const { from, to } = rangeFromTimeFilter(timeRange, custom);
    const column = SENSOR_READING_COLUMN[parameter];

    const { data, error } = await supabase
      .from('device_readings')
      .select(`recorded_at, ${column}`)
      .gte('recorded_at', from.toISOString())
      .lte('recorded_at', to.toISOString())
      .order('recorded_at', { ascending: true })
      .limit(2000);
    if (error) throw error;

    // Bucket real readings across all devices by timestamp (minute resolution) and average them.
    const buckets = new Map<string, number[]>();
    (data as unknown as ReadingRow[]).forEach((row) => {
      const bucketKey = row.recorded_at.slice(0, 16); // yyyy-MM-ddTHH:mm
      const value = Number(row[column] ?? 0);
      const bucket = buckets.get(bucketKey) ?? [];
      bucket.push(value);
      buckets.set(bucketKey, bucket);
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, values]) => ({
        timestamp,
        value: Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)),
      }));
  },

  async getFleetSummary(parameter: SensorParameter, timeRange: TimeRange, custom?: { from: string; to: string }): Promise<AnalyticsSummary> {
    const meta = SENSOR_META.find((m) => m.key === parameter);
    const series = await this.getFleetTrend(parameter, timeRange, custom);
    return summarize(series, meta?.unit ?? '');
  },
};
