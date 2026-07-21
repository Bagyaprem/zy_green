import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { firmwareService } from '@/services/firmwareService';
import { UploadFirmwareDialog } from '@/features/firmware/UploadFirmwareDialog';
import { DeployFirmwareDialog } from '@/features/firmware/DeployFirmwareDialog';
import { formatBytes, formatDateTime, formatRelativeTime } from '@/utils/format';
import type { DeviceFirmwareStatus, FirmwareHistoryEntry, FirmwareVersion } from '@/types';

export function FirmwarePage() {
  const queryClient = useQueryClient();
  const [deployTarget, setDeployTarget] = useState<FirmwareVersion | null>(null);

  const catalogQuery = useQuery({ queryKey: ['firmware-catalog'], queryFn: firmwareService.getCatalog });
  const deviceStatusQuery = useQuery({ queryKey: ['firmware-device-status'], queryFn: firmwareService.getDeviceStatuses });
  const historyQuery = useQuery({ queryKey: ['firmware-history'], queryFn: firmwareService.getHistory });

  const rollbackMutation = useMutation({
    mutationFn: firmwareService.rollback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-device-status'] });
      queryClient.invalidateQueries({ queryKey: ['firmware-history'] });
      toast.success('Firmware rolled back successfully');
    },
    onError: () => toast.error('Rollback failed'),
  });

  const catalogColumns: ColumnDef<FirmwareVersion>[] = [
    { accessorKey: 'version', header: 'Version' },
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'releaseNotes', header: 'Release Notes', cell: ({ row }) => <span className="line-clamp-1 max-w-xs text-xs text-muted-foreground">{row.original.releaseNotes}</span> },
    { accessorKey: 'releasedAt', header: 'Released', cell: ({ row }) => formatDateTime(row.original.releasedAt) },
    { accessorKey: 'sizeKb', header: 'Size', cell: ({ row }) => formatBytes(row.original.sizeKb) },
    {
      accessorKey: 'isStable',
      header: 'Channel',
      cell: ({ row }) => <Badge variant={row.original.isStable ? 'success' : 'warning'}>{row.original.isStable ? 'Stable' : 'Beta'}</Badge>,
    },
    { accessorKey: 'deployedDeviceCount', header: 'Deployed To' },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => setDeployTarget(row.original)}>
          <UploadCloud className="h-3.5 w-3.5" />
          Deploy
        </Button>
      ),
    },
  ];

  const deviceStatusColumns: ColumnDef<DeviceFirmwareStatus>[] = [
    { accessorKey: 'deviceName', header: 'Device' },
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'currentVersion', header: 'Current Version' },
    { accessorKey: 'latestVersion', header: 'Latest Version' },
    {
      accessorKey: 'updateAvailable',
      header: 'Status',
      cell: ({ row }) =>
        row.original.updateAvailable ? <Badge variant="info">Update Available</Badge> : <Badge variant="success">Up to date</Badge>,
    },
    {
      accessorKey: 'lastDeployedAt',
      header: 'Last Deployed',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelativeTime(row.original.lastDeployedAt)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Rollback">
              <RotateCcw className="h-4 w-4" />
            </Button>
          }
          title="Rollback firmware?"
          description={`This will revert ${row.original.deviceName} to its previous firmware version.`}
          confirmLabel="Rollback"
          onConfirm={() => rollbackMutation.mutate(row.original.deviceId)}
        />
      ),
    },
  ];

  const historyColumns: ColumnDef<FirmwareHistoryEntry>[] = [
    { accessorKey: 'deviceName', header: 'Device' },
    { accessorKey: 'action', header: 'Action', cell: ({ row }) => <Badge variant={row.original.action === 'Deploy' ? 'info' : 'warning'}>{row.original.action}</Badge> },
    { accessorKey: 'fromVersion', header: 'From' },
    { accessorKey: 'toVersion', header: 'To' },
    { accessorKey: 'performedBy', header: 'Performed By' },
    { accessorKey: 'performedAt', header: 'When', cell: ({ row }) => formatDateTime(row.original.performedAt) },
    {
      accessorKey: 'status',
      header: 'Result',
      cell: ({ row }) => <Badge variant={row.original.status === 'Success' ? 'success' : 'danger'}>{row.original.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Firmware" description="Manage OTA firmware releases and deployment across your device fleet." actions={<UploadFirmwareDialog />} />

      <Card>
        <CardHeader>
          <CardTitle>Firmware Catalog</CardTitle>
          <CardDescription>Available firmware versions by device model.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={catalogColumns}
            data={catalogQuery.data ?? []}
            isLoading={catalogQuery.isLoading}
            isError={catalogQuery.isError}
            onRetry={() => catalogQuery.refetch()}
            emptyTitle="No firmware versions yet"
            emptyDescription="Upload a firmware binary to get started."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Firmware Status</CardTitle>
          <CardDescription>Current firmware version installed on each device.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={deviceStatusColumns}
            data={deviceStatusQuery.data ?? []}
            isLoading={deviceStatusQuery.isLoading}
            isError={deviceStatusQuery.isError}
            onRetry={() => deviceStatusQuery.refetch()}
            emptyTitle="No devices found"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>Audit trail of firmware deployments and rollbacks.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={historyColumns}
            data={historyQuery.data ?? []}
            isLoading={historyQuery.isLoading}
            isError={historyQuery.isError}
            onRetry={() => historyQuery.refetch()}
            emptyTitle="No deployment history yet"
          />
        </CardContent>
      </Card>

      <DeployFirmwareDialog firmware={deployTarget} onOpenChange={(open) => !open && setDeployTarget(null)} />
    </div>
  );
}
