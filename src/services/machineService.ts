import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { sanitizeSearchTerm } from '@/utils/search';
import { STALE_THRESHOLD_MS } from '@/constants/status';
import type { CreateMachineInput, Machine, UpdateMachineInput } from '@/types';

export interface MachineFilters {
  search?: string;
  status?: string;
  customerId?: string;
}

/**
 * No machines_with_details view exists in the database — this embeds the
 * related customer/wifi/firmware/status rows in one query via PostgREST's
 * relationship syntax, which only needs the FK columns already on `machines`
 * and its satellite tables (no view required).
 */
const MACHINE_SELECT =
  '*, customers(customer_name), machine_wifi(connection_status, last_connected_at), machine_firmware(current_version), machine_status(is_online, sensor_status, uptime_seconds, last_seen)';

function isRecent(timestamp: string | null): boolean {
  if (!timestamp) return false;
  return Date.now() - new Date(timestamp).getTime() < STALE_THRESHOLD_MS;
}

interface MachineRow {
  id: string;
  customer_id: string | null;
  machine_name: string;
  machine_code: string;
  location: string | null;
  status: Machine['status'];
  created_at: string;
  customers: { customer_name: string } | null;
  machine_wifi: { connection_status: Machine['wifiStatus']; last_connected_at: string | null } | null;
  machine_firmware: { current_version: string | null } | null;
  machine_status: { is_online: boolean; sensor_status: string | null; uptime_seconds: number | null; last_seen: string | null } | null;
}

function mapMachine(row: MachineRow): Machine {
  const lastSeen = row.machine_status?.last_seen ?? null;
  const wifiLastConnectedAt = row.machine_wifi?.last_connected_at ?? null;
  const online = isRecent(lastSeen);

  return {
    id: row.id,
    customerId: row.customer_id ?? '',
    customerName: row.customers?.customer_name ?? '',
    machineName: row.machine_name,
    machineCode: row.machine_code,
    location: row.location ?? '',
    status: row.status,
    wifiStatus: isRecent(wifiLastConnectedAt) ? (row.machine_wifi?.connection_status ?? null) : 'Disconnected',
    firmwareVersion: row.machine_firmware?.current_version ?? null,
    isOnline: (row.machine_status?.is_online ?? false) && online,
    sensorStatus: online ? (row.machine_status?.sensor_status ?? null) : 'Unknown',
    uptimeSeconds: row.machine_status?.uptime_seconds ?? 0,
    lastSeen,
    createdAt: row.created_at,
  };
}

export const machineService = {
  async getMachines(filters?: MachineFilters): Promise<Machine[]> {
    assertSupabaseConfigured();
    let query = supabase.from('machines').select(MACHINE_SELECT).order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.customerId && filters.customerId !== 'all') query = query.eq('customer_id', filters.customerId);
    const q = filters?.search ? sanitizeSearchTerm(filters.search) : '';
    if (q) {
      query = query.or(`machine_name.ilike.%${q}%,machine_code.ilike.%${q}%,location.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as MachineRow[]).map(mapMachine);
  },

  async getMachine(id: string): Promise<Machine | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('machines').select(MACHINE_SELECT).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapMachine(data as unknown as MachineRow) : undefined;
  },

  async createMachine(input: CreateMachineInput): Promise<Machine> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('machines')
      .insert({
        customer_id: input.customerId,
        machine_name: input.machineName,
        machine_code: input.machineCode,
        location: input.location,
        status: input.status,
      })
      .select('*')
      .single();
    if (error) throw error;
    const machine = await machineService.getMachine(data.id);
    if (!machine) throw new Error('Machine was created but could not be re-fetched.');
    return machine;
  },

  async updateMachine(id: string, input: UpdateMachineInput): Promise<Machine> {
    assertSupabaseConfigured();
    const patch: Record<string, unknown> = {};
    if (input.customerId !== undefined) patch.customer_id = input.customerId;
    if (input.machineName !== undefined) patch.machine_name = input.machineName;
    if (input.machineCode !== undefined) patch.machine_code = input.machineCode;
    if (input.location !== undefined) patch.location = input.location;
    if (input.status !== undefined) patch.status = input.status;
    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from('machines').update(patch).eq('id', id);
    if (error) throw error;
    const machine = await machineService.getMachine(id);
    if (!machine) throw new Error('Machine was updated but could not be re-fetched.');
    return machine;
  },

  async deleteMachine(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('machines').delete().eq('id', id);
    if (error) throw error;
  },
};
