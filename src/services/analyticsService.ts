import analyticsMeta from '@/mock/analytics.json';
import devicesData from '@/mock/devices.json';
import customersData from '@/mock/customers.json';
import usersData from '@/mock/users.json';
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
import { wait } from '@/utils/latency';
import { appConfig } from '@/config/config';
import { generateHistoryRows, generateTrendSeries, rangeFromTimeFilter, summarize } from '@/utils/timeseries';
import { DEVICE_STATUS_CHART_COLORS } from '@/constants/statusColors';

const devices = devicesData as Device[];
const sensorMeta = analyticsMeta.sensorMeta as SensorMeta[];
const defaultThresholds = analyticsMeta.defaultThresholds as ThresholdSetting[];

export const analyticsService = {
  async getSensorMeta(): Promise<SensorMeta[]> {
    await wait(appConfig.mockLatency.fast);
    return sensorMeta;
  },

  async getDefaultThresholds(): Promise<ThresholdSetting[]> {
    await wait(appConfig.mockLatency.fast);
    return defaultThresholds;
  },

  async getDashboardKpis(): Promise<DashboardKpis> {
    await wait();
    const activeAlerts = await alertService.getActiveCount();
    return {
      totalDevices: devices.length,
      onlineDevices: devices.filter((d) => d.status === 'Online').length,
      offlineDevices: devices.filter((d) => d.status === 'Offline').length,
      disconnectedDevices: devices.filter((d) => d.status === 'Disconnected').length,
      maintenanceDevices: devices.filter((d) => d.status === 'Maintenance').length,
      activeAlerts,
      totalCustomers: customersData.length,
      totalUsers: usersData.length,
      avgDeviceHealth: Math.round(devices.reduce((sum, d) => sum + d.health, 0) / devices.length),
    };
  },

  async getDeviceStatusBreakdown(): Promise<DeviceStatusBreakdown[]> {
    await wait(appConfig.mockLatency.fast);
    const statuses: Device['status'][] = ['Online', 'Offline', 'Maintenance', 'Disconnected'];
    return statuses.map((status) => ({
      status,
      count: devices.filter((d) => d.status === status).length,
      color: DEVICE_STATUS_CHART_COLORS[status],
    }));
  },

  async getTrend(
    deviceId: string,
    parameter: SensorParameter,
    timeRange: '1H' | '24H' | '7D' | '30D' | 'CUSTOM',
    custom?: { from: string; to: string }
  ): Promise<TrendPoint[]> {
    await wait();
    const { from, to } = rangeFromTimeFilter(timeRange, custom);
    const points = timeRange === '1H' ? 30 : timeRange === '24H' ? 48 : timeRange === '7D' ? 56 : timeRange === '30D' ? 60 : 48;
    return generateTrendSeries(deviceId, parameter, from, to, points);
  },

  async getSummary(
    deviceId: string,
    parameter: SensorParameter,
    timeRange: '1H' | '24H' | '7D' | '30D' | 'CUSTOM',
    custom?: { from: string; to: string }
  ): Promise<AnalyticsSummary> {
    await wait(appConfig.mockLatency.fast);
    const meta = sensorMeta.find((m) => m.key === parameter);
    const series = await this.getTrend(deviceId, parameter, timeRange, custom);
    return summarize(series, meta?.unit ?? '');
  },

  async getHistory(
    deviceId: string,
    from: string,
    to: string
  ): Promise<HistoryRow[]> {
    await wait();
    return generateHistoryRows(deviceId, new Date(from), new Date(to), 45);
  },

  async getTopDevices(limit = 5): Promise<Device[]> {
    await wait(appConfig.mockLatency.fast);
    return [...devices].sort((a, b) => b.health - a.health).slice(0, limit);
  },
};
