import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { ActivityLogEntry } from '@/types';

export interface ActivityLogFilters {
  search?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

interface ActivityLogRow {
  id: string;
  actor: string;
  actor_role: string | null;
  action: string;
  entity_type: ActivityLogEntry['entityType'];
  entity_name: string | null;
  timestamp: string;
  details: string | null;
  ip: string | null;
}

function mapLog(row: ActivityLogRow): ActivityLogEntry {
  return {
    id: row.id,
    actor: row.actor,
    actorRole: row.actor_role ?? '',
    action: row.action,
    entityType: row.entity_type,
    entityName: row.entity_name ?? '',
    timestamp: row.timestamp,
    details: row.details ?? '',
    ip: row.ip ?? '',
  };
}

export const activityLogService = {
  async getLogs(filters?: ActivityLogFilters): Promise<ActivityLogEntry[]> {
    assertSupabaseConfigured();
    let query = supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(500);

    if (filters?.search) {
      query = query.or(`actor.ilike.%${filters.search}%,action.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%`);
    }
    if (filters?.entityType && filters.entityType !== 'all') query = query.eq('entity_type', filters.entityType);
    if (filters?.from) query = query.gte('timestamp', filters.from);
    if (filters?.to) query = query.lte('timestamp', filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return (data as ActivityLogRow[]).map(mapLog);
  },

  async getRecent(limit = 8): Promise<ActivityLogEntry[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as ActivityLogRow[]).map(mapLog);
  },
};
