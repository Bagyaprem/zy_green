import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { MachineWifi, SaveWifiInput } from '@/types';

interface WifiRow {
  machine_id: string;
  ssid: string | null;
  password: string | null;
  connection_status: MachineWifi['connectionStatus'];
  ip_address: string | null;
  mac_address: string | null;
  last_connected_at: string | null;
}

function mapWifi(machineId: string, row: WifiRow | null): MachineWifi {
  return {
    machineId,
    ssid: row?.ssid ?? '',
    password: row?.password ?? '',
    connectionStatus: row?.connection_status ?? 'Disconnected',
    ipAddress: row?.ip_address ?? '',
    macAddress: row?.mac_address ?? '',
    lastConnectedAt: row?.last_connected_at ?? null,
  };
}

export const wifiService = {
  async getWifi(machineId: string): Promise<MachineWifi> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('machine_wifi').select('*').eq('machine_id', machineId).maybeSingle();
    if (error) throw error;
    return mapWifi(machineId, data as WifiRow | null);
  },

  async saveWifi(machineId: string, input: SaveWifiInput): Promise<MachineWifi> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('machine_wifi')
      .upsert({ machine_id: machineId, ssid: input.ssid, password: input.password }, { onConflict: 'machine_id' })
      .select('*')
      .single();
    if (error) throw error;
    return mapWifi(machineId, data as WifiRow);
  },
};
