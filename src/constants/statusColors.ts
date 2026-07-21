import type { AlertSeverity, AlertStatus, DeviceStatus } from '@/types';

export const deviceStatusColor: Record<DeviceStatus, string> = {
  Online: 'success',
  Offline: 'danger',
  Maintenance: 'warning',
  Disconnected: 'muted',
};

export const deviceStatusDot: Record<DeviceStatus, string> = {
  Online: 'bg-success',
  Offline: 'bg-danger',
  Maintenance: 'bg-warning',
  Disconnected: 'bg-muted-foreground',
};

export const alertSeverityColor: Record<AlertSeverity, string> = {
  Critical: 'danger',
  High: 'danger',
  Medium: 'warning',
  Low: 'info',
  Info: 'muted',
};

export const alertStatusColor: Record<AlertStatus, string> = {
  Active: 'danger',
  Acknowledged: 'warning',
  Resolved: 'success',
};

export const DEVICE_STATUS_CHART_COLORS: Record<DeviceStatus, string> = {
  Online: '#22C55E',
  Offline: '#EF4444',
  Maintenance: '#F59E0B',
  Disconnected: '#94A3B8',
};
