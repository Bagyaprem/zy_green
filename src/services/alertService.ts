import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { AlertStatus, DeviceAlert } from '@/types';

export interface AlertFilters {
  severity?: string;
  status?: string;
  from?: string;
  to?: string;
  deviceId?: string;
}

interface AlertRow {
  id: string;
  device_id: string;
  message: string;
  severity: DeviceAlert['severity'];
  status: DeviceAlert['status'];
  parameter: string | null;
  value: number | null;
  threshold: number | null;
  created_at: string;
  resolved_at: string | null;
  devices?: { name: string; customer_name: string | null } | null;
}

function mapAlert(row: AlertRow): DeviceAlert {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.devices?.name ?? row.device_id,
    customerName: row.devices?.customer_name ?? '',
    message: row.message,
    severity: row.severity,
    status: row.status,
    parameter: row.parameter ?? '',
    value: row.value,
    threshold: row.threshold,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

const ALERT_SELECT = '*, devices(name, customer_name)';

export const alertService = {
  async getAlerts(filters?: AlertFilters): Promise<DeviceAlert[]> {
    assertSupabaseConfigured();
    let query = supabase.from('alerts').select(ALERT_SELECT).order('created_at', { ascending: false });

    if (filters?.severity && filters.severity !== 'all') query = query.eq('severity', filters.severity);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.deviceId) query = query.eq('device_id', filters.deviceId);
    if (filters?.from) query = query.gte('created_at', filters.from);
    if (filters?.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as AlertRow[]).map(mapAlert);
  },

  async getRecentAlerts(limit = 5): Promise<DeviceAlert[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('alerts')
      .select(ALERT_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as unknown as AlertRow[]).map(mapAlert);
  },

  async updateStatus(id: string, status: AlertStatus): Promise<DeviceAlert> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('alerts')
      .update({ status, resolved_at: status === 'Resolved' ? new Date().toISOString() : null })
      .eq('id', id)
      .select(ALERT_SELECT)
      .single();
    if (error) throw error;
    return mapAlert(data as unknown as AlertRow);
  },

  async clearAll(): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'Resolved', resolved_at: new Date().toISOString() })
      .neq('status', 'Resolved');
    if (error) throw error;
  },

  async getActiveCount(): Promise<number> {
    assertSupabaseConfigured();
    const { count, error } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'Active');
    if (error) throw error;
    return count ?? 0;
  },
};
