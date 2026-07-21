import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { SaveWifiConfigInput, WifiConfig, WifiNetwork } from '@/types';

interface WifiConfigRow {
  device_id: string;
  ssid: string | null;
  connected: boolean;
  ip_address: string | null;
  signal: number | null;
  last_connected_at: string | null;
}

function mapConfig(row: WifiConfigRow): WifiConfig {
  return {
    deviceId: row.device_id,
    ssid: row.ssid ?? '',
    connected: row.connected,
    ipAddress: row.ip_address ?? '',
    signal: row.signal ?? 0,
    lastConnectedAt: row.last_connected_at,
  };
}

export const wifiService = {
  async getConfig(deviceId: string): Promise<WifiConfig | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('wifi_configs').select('*').eq('device_id', deviceId).maybeSingle();
    if (error) throw error;
    return data ? mapConfig(data as WifiConfigRow) : undefined;
  },

  /**
   * Scanning for nearby WiFi networks is a live radio operation performed by
   * the device itself, not a table read — this calls a Supabase Edge
   * Function that would relay the request to the device over MQTT/HTTP and
   * return its scan results. Not deployed by supabase_admin_schema.sql; with
   * placeholder credentials this fails gracefully like every other call here.
   */
  async scanNetworks(): Promise<WifiNetwork[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.functions.invoke('wifi-scan');
    if (error) throw error;
    return (data ?? []) as WifiNetwork[];
  },

  async connect(deviceId: string, ssid: string): Promise<WifiConfig> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('wifi_configs')
      .upsert({ device_id: deviceId, ssid, connected: true, last_connected_at: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw error;
    return mapConfig(data as WifiConfigRow);
  },

  async disconnect(deviceId: string): Promise<WifiConfig> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('wifi_configs')
      .update({ connected: false, signal: 0 })
      .eq('device_id', deviceId)
      .select('*')
      .single();
    if (error) throw error;
    return mapConfig(data as WifiConfigRow);
  },

  /**
   * Pushes SSID/password provisioning to the device via an Edge Function
   * (never store WiFi passwords in a plain table); the device confirms the
   * new connection back through its own telemetry update.
   */
  async saveConfiguration(input: SaveWifiConfigInput): Promise<WifiConfig> {
    assertSupabaseConfigured();
    const { error } = await supabase.functions.invoke('provision-device-wifi', { body: input });
    if (error) throw error;
    return this.connect(input.deviceId, input.ssid);
  },
};
