import type { SensorParameter, TimeRange } from '@/types';

export const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '1H', value: '1H' },
  { label: '24H', value: '24H' },
  { label: '7D', value: '7D' },
  { label: '30D', value: '30D' },
  { label: 'Custom', value: 'CUSTOM' },
];

export const SENSOR_PARAMETERS: SensorParameter[] = [
  'AQI',
  'PM2.5',
  'PM10',
  'CO2',
  'Temperature',
  'Humidity',
  'TVOC',
  'Pressure',
  'Light',
  'Noise',
];

export const DEVICE_STATUS_OPTIONS = ['Online', 'Offline', 'Maintenance', 'Disconnected'] as const;
export const ALERT_SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;
export const ALERT_STATUS_OPTIONS = ['Active', 'Acknowledged', 'Resolved'] as const;
export const USER_ROLE_OPTIONS = ['Super Admin', 'Admin', 'Operator', 'Viewer'] as const;
export const REPORT_TYPE_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Custom'] as const;
