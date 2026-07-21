import alertsData from '@/mock/alerts.json';
import type { AlertStatus, DeviceAlert } from '@/types';
import { wait } from '@/utils/latency';
import { appConfig } from '@/config/config';

let alerts: DeviceAlert[] = JSON.parse(JSON.stringify(alertsData)) as DeviceAlert[];

export interface AlertFilters {
  severity?: string;
  status?: string;
  from?: string;
  to?: string;
  deviceId?: string;
}

export const alertService = {
  async getAlerts(filters?: AlertFilters): Promise<DeviceAlert[]> {
    await wait();
    let result = alerts;
    if (filters?.severity && filters.severity !== 'all') {
      result = result.filter((a) => a.severity === filters.severity);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.deviceId) {
      result = result.filter((a) => a.deviceId === filters.deviceId);
    }
    if (filters?.from) {
      result = result.filter((a) => new Date(a.createdAt) >= new Date(filters.from as string));
    }
    if (filters?.to) {
      result = result.filter((a) => new Date(a.createdAt) <= new Date(filters.to as string));
    }
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getRecentAlerts(limit = 5): Promise<DeviceAlert[]> {
    await wait(appConfig.mockLatency.fast);
    return [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  },

  async updateStatus(id: string, status: AlertStatus): Promise<DeviceAlert> {
    await wait();
    const idx = alerts.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Alert not found');
    alerts[idx] = {
      ...alerts[idx],
      status,
      resolvedAt: status === 'Resolved' ? new Date().toISOString() : alerts[idx].resolvedAt,
    };
    return alerts[idx];
  },

  async clearAll(): Promise<void> {
    await wait(appConfig.mockLatency.slow);
    alerts = alerts.map((a) => ({ ...a, status: 'Resolved' as AlertStatus, resolvedAt: new Date().toISOString() }));
  },

  async getActiveCount(): Promise<number> {
    await wait(appConfig.mockLatency.fast);
    return alerts.filter((a) => a.status === 'Active').length;
  },
};
