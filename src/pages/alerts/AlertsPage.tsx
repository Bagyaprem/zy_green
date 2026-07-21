import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, CheckCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { AlertSeverityBadge, AlertStatusBadge } from '@/components/shared/StatusBadge';
import { alertService } from '@/services/alertService';
import { useAlertStore } from '@/store/alertStore';
import { ALERT_SEVERITY_OPTIONS, ALERT_STATUS_OPTIONS } from '@/constants/options';
import { formatDateTime } from '@/utils/format';
import type { DeviceAlert } from '@/types';

export function AlertsPage() {
  const { severity, status, from, to, setSeverity, setStatus, setFrom, setTo } = useAlertStore();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['alerts', severity, status, from, to],
    queryFn: () => alertService.getAlerts({ severity, status, from, to }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: DeviceAlert['status'] }) => alertService.updateStatus(id, s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['recent-alerts'] });
      toast.success('Alert updated');
    },
    onError: () => toast.error('Failed to update alert'),
  });

  const clearAllMutation = useMutation({
    mutationFn: alertService.clearAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('All alerts cleared');
    },
    onError: () => toast.error('Failed to clear alerts'),
  });

  const columns: ColumnDef<DeviceAlert>[] = [
    { accessorKey: 'createdAt', header: 'Time', cell: ({ row }) => <span className="text-xs">{formatDateTime(row.original.createdAt)}</span> },
    { accessorKey: 'deviceId', header: 'Device ID' },
    { accessorKey: 'message', header: 'Alert Message' },
    { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => <AlertSeverityBadge severity={row.original.severity} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <AlertStatusBadge status={row.original.status} /> },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const alert = row.original;
        return (
          <div className="flex items-center gap-1">
            {alert.status === 'Active' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Acknowledge"
                onClick={() => updateMutation.mutate({ id: alert.id, status: 'Acknowledged' })}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            {alert.status !== 'Resolved' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Resolve"
                onClick={() => updateMutation.mutate({ id: alert.id, status: 'Resolved' })}
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts" description="Monitor and respond to device alerts across your fleet." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {ALERT_SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALERT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          <ConfirmDialog
            trigger={
              <Button variant="destructive" className="ml-auto">
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            }
            title="Resolve all alerts?"
            description="This will mark every alert as Resolved. This action cannot be undone."
            confirmLabel="Clear All"
            onConfirm={() => clearAllMutation.mutate()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={alertsQuery.data ?? []}
            isLoading={alertsQuery.isLoading}
            isError={alertsQuery.isError}
            onRetry={() => alertsQuery.refetch()}
            emptyTitle="No alerts found"
            emptyDescription="Try adjusting your filters, or your fleet may be running clean."
          />
        </CardContent>
      </Card>
    </div>
  );
}
