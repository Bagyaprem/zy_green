import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { STALE_THRESHOLD_MS } from '@/constants/status';
import type { DashboardKpis } from '@/types';

/** No dashboard_kpis view exists in the database — computed here with direct counts against real tables. */
export const analyticsService = {
  async getDashboardKpis(): Promise<DashboardKpis> {
    assertSupabaseConfigured();

    // is_online alone is unreliable — a device can only ever report "I'm online",
    // never "I just went offline", so a dead device still shows is_online=true
    // forever. Only count it online if its heartbeat is also recent.
    const recentCutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

    const [totalMachines, onlineMachines, activeAlerts, totalCustomers] = await Promise.all([
      supabase.from('machines').select('*', { count: 'exact', head: true }),
      supabase.from('machine_status').select('*', { count: 'exact', head: true }).eq('is_online', true).gte('last_seen', recentCutoff),
      supabase.from('machine_alerts').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
    ]);

    if (totalMachines.error) throw totalMachines.error;
    if (onlineMachines.error) throw onlineMachines.error;
    if (activeAlerts.error) throw activeAlerts.error;
    if (totalCustomers.error) throw totalCustomers.error;

    const total = totalMachines.count ?? 0;
    const online = onlineMachines.count ?? 0;

    return {
      totalMachines: total,
      onlineMachines: online,
      offlineMachines: Math.max(total - online, 0),
      activeAlerts: activeAlerts.count ?? 0,
      totalCustomers: totalCustomers.count ?? 0,
    };
  },
};
