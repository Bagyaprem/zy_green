export type DeviceStatus = 'Online' | 'Offline' | 'Maintenance' | 'Disconnected';

export interface DeviceReadings {
  aqi: number;
  pm25: number;
  pm10: number;
  co2: number;
  temperature: number;
  humidity: number;
  tvoc: number;
  pressure: number;
  light: number;
  noise: number;
}

export interface Device {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  location: string;
  model: string;
  serialNumber: string;
  macAddress: string;
  firmwareVersion: string;
  wifiSsid: string;
  wifiSignal: number; // percent
  status: DeviceStatus;
  health: number; // percent
  lastSync: string; // ISO date
  timezone: string;
  uploadIntervalSec: number;
  autoRestart: boolean;
  installedAt: string;
  readings: DeviceReadings;
  tags: string[];
}

export interface DeviceLogEntry {
  id: string;
  deviceId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface CreateDeviceInput {
  name: string;
  customerId: string;
  location: string;
  model: string;
  serialNumber: string;
  macAddress: string;
  timezone: string;
  uploadIntervalSec: number;
}

export type UpdateDeviceInput = Partial<CreateDeviceInput> & {
  status?: DeviceStatus;
  autoRestart?: boolean;
  wifiSsid?: string;
};
