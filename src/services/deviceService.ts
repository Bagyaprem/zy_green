import devicesData from '@/mock/devices.json';
import type { CreateDeviceInput, Device, DeviceLogEntry, UpdateDeviceInput } from '@/types';
import { wait } from '@/utils/latency';
import { generateId } from '@/utils/id';
import { appConfig } from '@/config/config';

let devices: Device[] = JSON.parse(JSON.stringify(devicesData)) as Device[];

export interface DeviceFilters {
  search?: string;
  status?: string;
  customerId?: string;
  location?: string;
}

function applyFilters(list: Device[], filters?: DeviceFilters): Device[] {
  if (!filters) return list;
  let result = list;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q)
    );
  }
  if (filters.status && filters.status !== 'all') {
    result = result.filter((d) => d.status === filters.status);
  }
  if (filters.customerId && filters.customerId !== 'all') {
    result = result.filter((d) => d.customerId === filters.customerId);
  }
  if (filters.location && filters.location !== 'all') {
    result = result.filter((d) => d.location === filters.location);
  }
  return result;
}

export const deviceService = {
  async getDevices(filters?: DeviceFilters): Promise<Device[]> {
    await wait();
    return applyFilters(devices, filters).sort(
      (a, b) => new Date(b.lastSync).getTime() - new Date(a.lastSync).getTime()
    );
  },

  async getDevice(id: string): Promise<Device | undefined> {
    await wait(appConfig.mockLatency.fast);
    return devices.find((d) => d.id === id);
  },

  async createDevice(input: CreateDeviceInput): Promise<Device> {
    await wait(appConfig.mockLatency.slow);
    const id = generateId('ZYG-AP');
    const newDevice: Device = {
      id,
      name: input.name,
      customerId: input.customerId,
      customerName: input.customerId,
      location: input.location,
      model: input.model,
      serialNumber: input.serialNumber,
      macAddress: input.macAddress,
      firmwareVersion: 'v1.2.0',
      wifiSsid: '',
      wifiSignal: 0,
      status: 'Disconnected',
      health: 0,
      lastSync: new Date().toISOString(),
      timezone: input.timezone,
      uploadIntervalSec: input.uploadIntervalSec,
      autoRestart: true,
      installedAt: new Date().toISOString(),
      readings: {
        aqi: 0,
        pm25: 0,
        pm10: 0,
        co2: 400,
        temperature: 25,
        humidity: 50,
        tvoc: 0,
        pressure: 1013,
        light: 0,
        noise: 0,
      },
      tags: [],
    };
    devices = [newDevice, ...devices];
    return newDevice;
  },

  async updateDevice(id: string, input: UpdateDeviceInput): Promise<Device> {
    await wait();
    const idx = devices.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Device not found');
    devices[idx] = { ...devices[idx], ...input };
    return devices[idx];
  },

  async deleteDevice(id: string): Promise<void> {
    await wait();
    devices = devices.filter((d) => d.id !== id);
  },

  async restartDevice(id: string): Promise<Device> {
    await wait(appConfig.mockLatency.slow);
    const idx = devices.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Device not found');
    devices[idx] = { ...devices[idx], status: 'Online', lastSync: new Date().toISOString(), health: Math.min(100, devices[idx].health + 5) };
    return devices[idx];
  },

  async getDeviceLogs(id: string): Promise<DeviceLogEntry[]> {
    await wait(appConfig.mockLatency.fast);
    const levels: DeviceLogEntry['level'][] = ['info', 'info', 'info', 'warning', 'error'];
    const messages = [
      'Heartbeat received',
      'Sensor calibration check passed',
      'Uploaded telemetry batch',
      'WiFi signal dropped below 40%',
      'Reconnected to broker after timeout',
      'CO2 sensor warm-up complete',
      'NTP time sync completed',
      'Firmware watchdog reset triggered',
    ];
    return Array.from({ length: 24 }, (_, i) => ({
      id: `${id}-LOG-${i}`,
      deviceId: id,
      timestamp: new Date(Date.now() - i * 18 * 60 * 1000).toISOString(),
      level: levels[i % levels.length],
      message: messages[i % messages.length],
    }));
  },

  async getLocations(): Promise<string[]> {
    await wait(appConfig.mockLatency.fast);
    return Array.from(new Set(devices.map((d) => d.location))).sort();
  },

  /** Returns a lightly-jittered snapshot of a device's live readings, simulating a fresh telemetry poll. */
  async getLiveSnapshot(id: string) {
    await wait(appConfig.mockLatency.fast);
    const device = devices.find((d) => d.id === id);
    if (!device) throw new Error('Device not found');
    const jitter = (value: number, spread: number) => Math.max(0, value + (Math.random() - 0.5) * spread);
    const readings = {
      aqi: Math.round(jitter(device.readings.aqi, 8)),
      pm25: Math.round(jitter(device.readings.pm25, 4)),
      pm10: Math.round(jitter(device.readings.pm10, 6)),
      co2: Math.round(jitter(device.readings.co2, 30)),
      temperature: Number(jitter(device.readings.temperature, 0.6).toFixed(1)),
      humidity: Math.round(jitter(device.readings.humidity, 3)),
      tvoc: Number(jitter(device.readings.tvoc, 0.04).toFixed(2)),
      pressure: Math.round(jitter(device.readings.pressure, 1.5)),
      light: Math.round(jitter(device.readings.light, 20)),
      noise: Math.round(jitter(device.readings.noise, 2)),
    };
    device.readings = readings;
    device.lastSync = new Date().toISOString();
    return { readings, timestamp: device.lastSync };
  },
};
