import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { machineLogService } from '@/services/machineLogService';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateTime } from '@/utils/format';
import type { MachineLogEntry } from '@/types';

const columns: ColumnDef<MachineLogEntry>[] = [
  { accessorKey: 'machineName', header: 'Machine' },
  { accessorKey: 'logType', header: 'Action', cell: ({ row }) => <Badge variant="secondary">{row.original.logType}</Badge> },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'createdAt', header: 'Time', cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  const logsQuery = useQuery({ queryKey: ['machine-logs', debouncedSearch], queryFn: () => machineLogService.getLogs({ search: debouncedSearch }) });

  return (
    <div className="space-y-5">
      <PageHeader title="Activity Logs" description="Event history reported by every machine." />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
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
            emptyTitle="No activity yet"
            emptyDescription="Machine events (restarts, OTA updates, WiFi changes) will show up here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
