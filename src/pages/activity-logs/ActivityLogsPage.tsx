import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { activityLogService } from '@/services/activityLogService';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateTime } from '@/utils/format';
import type { ActivityLogEntry } from '@/types';

const ENTITY_TYPES = ['Device', 'Customer', 'User', 'Firmware', 'Alert', 'Settings', 'Report', 'Auth'];

const columns: ColumnDef<ActivityLogEntry>[] = [
  { accessorKey: 'timestamp', header: 'When', cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.timestamp)}</span> },
  {
    accessorKey: 'actor',
    header: 'Who',
    cell: ({ row }) => (
      <div>
        <p className="text-foreground">{row.original.actor}</p>
        <p className="text-xs text-muted-foreground">{row.original.actorRole}</p>
      </div>
    ),
  },
  { accessorKey: 'action', header: 'What', cell: ({ row }) => <span className="capitalize">{row.original.action}</span> },
  {
    accessorKey: 'entityType',
    header: 'Entity',
    cell: ({ row }) => <Badge variant="outline">{row.original.entityType}</Badge>,
  },
  { accessorKey: 'entityName', header: 'Target' },
  { accessorKey: 'ip', header: 'IP Address', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.ip}</span> },
];

export function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('all');
  const debouncedSearch = useDebounce(search, 250);

  const logsQuery = useQuery({
    queryKey: ['activity-logs', debouncedSearch, entityType],
    queryFn: () => activityLogService.getLogs({ search: debouncedSearch, entityType }),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Activity Logs" description="Full audit trail of actions taken across the ZYGREEN admin console." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by actor, action, or target..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={logsQuery.data ?? []}
            isLoading={logsQuery.isLoading}
            isError={logsQuery.isError}
            onRetry={() => logsQuery.refetch()}
            emptyTitle="No activity found"
            emptyDescription="Try adjusting your search or filters."
          />
        </CardContent>
      </Card>
    </div>
  );
}
