import activityLogsData from '@/mock/activityLogs.json';
import type { ActivityLogEntry } from '@/types';
import { wait } from '@/utils/latency';
import { appConfig } from '@/config/config';

const logs: ActivityLogEntry[] = activityLogsData as ActivityLogEntry[];

export interface ActivityLogFilters {
  search?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export const activityLogService = {
  async getLogs(filters?: ActivityLogFilters): Promise<ActivityLogEntry[]> {
    await wait();
    let result = logs;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) => l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.entityName.toLowerCase().includes(q)
      );
    }
    if (filters?.entityType && filters.entityType !== 'all') {
      result = result.filter((l) => l.entityType === filters.entityType);
    }
    if (filters?.from) {
      result = result.filter((l) => new Date(l.timestamp) >= new Date(filters.from as string));
    }
    if (filters?.to) {
      result = result.filter((l) => new Date(l.timestamp) <= new Date(filters.to as string));
    }
    return [...result].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async getRecent(limit = 8): Promise<ActivityLogEntry[]> {
    await wait(appConfig.mockLatency.fast);
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  },
};
