import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { CreateDeviceInput, Device, DeviceLogEntry, DeviceReadings, UpdateDeviceInput } from '@/types';
import { generateId } from '@/utils/id';

export interface DeviceFilters {
  search?: string;
  status?: string;
  customerId?: string;
  location?: string;
}

interface DeviceRow {
  id: string;
  name: string;
  customer_id: string | null;
  customer_name: string | null;
  location: string | null;
  model: string;
  serial_number: string | null;
  mac_address: string | null;
  firmware_version: string | null;
  wifi_ssid: string | null;
  wifi_signal: number | null;
  status: Device['status'];
  health: number;
  last_sync: string | null;
  timezone: string | null;
  upload_interval_sec: number;
  auto_restart: boolean;
  installed_at: string;
  tags: string[] | null;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  co2: number | null;
  temperature: number | null;
  humidity: number | null;
  tvoc: number | null;
  pressure: number | null;
  light: number | null;
  noise: number | null;
}

function mapDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id ?? '',
    customerName: row.customer_name ?? '',
    location: row.location ?? '',
    model: row.model,
    serialNumber: row.serial_number ?? '',
    macAddress: row.mac_address ?? '',
    firmwareVersion: row.firmware_version ?? '',
    wifiSsid: row.wifi_ssid ?? '',
    wifiSignal: row.wifi_signal ?? 0,
    status: row.status,
    health: row.health,
    lastSync: row.last_sync ?? row.installed_at,
    timezone: row.timezone ?? '',
    uploadIntervalSec: row.upload_interval_sec,
    autoRestart: row.auto_restart,
    installedAt: row.installed_at,
    tags: row.tags ?? [],
    readings: {
      aqi: row.aqi ?? 0,
      pm25: row.pm25 ?? 0,
      pm10: row.pm10 ?? 0,
      co2: row.co2 ?? 0,
      temperature: row.temperature ?? 0,
      humidity: row.humidity ?? 0,
      tvoc: row.tvoc ?? 0,
      pressure: row.pressure ?? 0,
      light: row.light ?? 0,
      noise: row.noise ?? 0,
    },
  };
}

export const deviceService = {
  async getDevices(filters?: DeviceFilters): Promise<Device[]> {
    assertSupabaseConfigured();
    let query = supabase.from('devices').select('*').order('last_sync', { ascending: false, nullsFirst: false });

    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.customerId && filters.customerId !== 'all') query = query.eq('customer_id', filters.customerId);
    if (filters?.location && filters.location !== 'all') query = query.eq('location', filters.location);
    if (filters?.search) {
      const q = filters.search;
      query = query.or(`name.ilike.%${q}%,id.ilike.%${q}%,customer_name.ilike.%${q}%,location.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as DeviceRow[]).map(mapDevice);
  },

  async getDevice(id: string): Promise<Device | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('devices').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapDevice(data as DeviceRow) : undefined;
  },

  async createDevice(input: CreateDeviceInput): Promise<Device> {
    assertSupabaseConfigured();
    const id = generateId('ZYG-AP');
    let customerName = '';
    if (input.customerId) {
      const { data: customer } = await supabase.from('customers').select('name').eq('id', input.customerId).maybeSingle();
      customerName = customer?.name ?? '';
    }

    const { data, error } = await supabase
      .from('devices')
      .insert({
        id,
        name: input.name,
        customer_id: input.customerId || null,
        customer_name: customerName,
        location: input.location,
        model: input.model,
        serial_number: input.serialNumber,
        mac_address: input.macAddress,
        firmware_version: 'v1.2.0',
        status: 'Disconnected',
        health: 0,
        timezone: input.timezone,
        upload_interval_sec: input.uploadIntervalSec,
        auto_restart: true,
        installed_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapDevice(data as DeviceRow);
  },

  async updateDevice(id: string, input: UpdateDeviceInput): Promise<Device> {
    assertSupabaseConfigured();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.customerId !== undefined) patch.customer_id = input.customerId;
    if (input.location !== undefined) patch.location = input.location;
    if (input.model !== undefined) patch.model = input.model;
    if (input.serialNumber !== undefined) patch.serial_number = input.serialNumber;
    if (input.macAddress !== undefined) patch.mac_address = input.macAddress;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.uploadIntervalSec !== undefined) patch.upload_interval_sec = input.uploadIntervalSec;
    if (input.status !== undefined) patch.status = input.status;
    if (input.autoRestart !== undefined) patch.auto_restart = input.autoRestart;
    if (input.wifiSsid !== undefined) patch.wifi_ssid = input.wifiSsid;

    const { data, error } = await supabase.from('devices').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return mapDevice(data as DeviceRow);
  },

  async deleteDevice(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw error;
  },

  async restartDevice(id: string): Promise<Device> {
    assertSupabaseConfigured();
    // In production this would publish an MQTT restart command and the
    // device itself would report back Online via telemetry. Here we just
    // record the admin's restart request against the device row.
    const { data, error } = await supabase
      .from('devices')
      .update({ status: 'Online', last_sync: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDevice(data as DeviceRow);
  },

  async getDeviceLogs(id: string): Promise<DeviceLogEntry[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('device_logs')
      .select('*')
      .eq('device_id', id)
      .order('timestamp', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      deviceId: row.device_id,
      timestamp: row.timestamp,
      level: row.level,
      message: row.message,
    }));
  },

  async getLocations(): Promise<string[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('devices').select('location').not('location', 'is', null);
    if (error) throw error;
    return Array.from(new Set((data ?? []).map((row) => row.location as string))).sort();
  },

  async getDevicesSortedByHealth(limit = 5): Promise<Device[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('devices').select('*').order('health', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as DeviceRow[]).map(mapDevice);
  },

  /** Re-polls the device's current telemetry snapshot columns (used by Live Monitoring). */
  async getLiveSnapshot(id: string): Promise<{ readings: DeviceReadings; timestamp: string }> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('devices')
      .select('aqi, pm25, pm10, co2, temperature, humidity, tvoc, pressure, light, noise, last_sync')
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      readings: {
        aqi: data.aqi ?? 0,
        pm25: data.pm25 ?? 0,
        pm10: data.pm10 ?? 0,
        co2: data.co2 ?? 0,
        temperature: data.temperature ?? 0,
        humidity: data.humidity ?? 0,
        tvoc: data.tvoc ?? 0,
        pressure: data.pressure ?? 0,
        light: data.light ?? 0,
        noise: data.noise ?? 0,
      },
      timestamp: data.last_sync ?? new Date().toISOString(),
    };
  },
};
