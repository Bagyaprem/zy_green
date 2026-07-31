import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { MachineAlert } from '@/types';

interface AlertRow {
  id: string;
  machine_id: string;
  alert_type: MachineAlert['alertType'];
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  machines: { machine_name: string } | null;
}

function mapAlert(row: AlertRow): MachineAlert {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineName: row.machines?.machine_name ?? '',
    alertType: row.alert_type,
    message: row.message,
    isResolved: row.is_resolved,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export const machineAlertService = {
  async getAlerts(filters?: { status?: string }): Promise<MachineAlert[]> {
    assertSupabaseConfigured();
    let query = supabase.from('machine_alerts').select('*, machines(machine_name)').order('created_at', { ascending: false });
    if (filters?.status === 'Active') query = query.eq('is_resolved', false);
    if (filters?.status === 'Resolved') query = query.eq('is_resolved', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as AlertRow[]).map(mapAlert);
  },

  async getRecentAlerts(limit = 5): Promise<MachineAlert[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('machine_alerts')
      .select('*, machines(machine_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as unknown as AlertRow[]).map(mapAlert);
  },

  async resolveAlert(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('machine_alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
