import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { sanitizeSearchTerm } from '@/utils/search';
import type { MachineLogEntry } from '@/types';

interface LogRow {
  id: string;
  machine_id: string;
  log_type: string;
  description: string;
  created_at: string;
  machines: { machine_name: string } | null;
}

function mapLog(row: LogRow): MachineLogEntry {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineName: row.machines?.machine_name ?? '',
    logType: row.log_type,
    description: row.description,
    createdAt: row.created_at,
  };
}

export const machineLogService = {
  async getLogs(filters?: { search?: string; machineId?: string }): Promise<MachineLogEntry[]> {
    assertSupabaseConfigured();
    let query = supabase
      .from('machine_logs')
      .select('*, machines(machine_name)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (filters?.machineId && filters.machineId !== 'all') query = query.eq('machine_id', filters.machineId);
    const q = filters?.search ? sanitizeSearchTerm(filters.search) : '';
    if (q) query = query.or(`log_type.ilike.%${q}%,description.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as LogRow[]).map(mapLog);
  },

  async getRecent(limit = 6): Promise<MachineLogEntry[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('machine_logs')
      .select('*, machines(machine_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as unknown as LogRow[]).map(mapLog);
  },
};
