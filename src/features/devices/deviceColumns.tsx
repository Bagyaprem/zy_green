import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Eye, Pencil, RotateCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceStatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Device } from '@/types';
import { formatRelativeTime } from '@/utils/format';

interface DeviceColumnActions {
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  onRestart: (device: Device) => void;
}

export function buildDeviceColumns({ onEdit, onDelete, onRestart }: DeviceColumnActions): ColumnDef<Device>[] {
  return [
    {
      accessorKey: 'id',
      header: 'Device ID',
      cell: ({ row }) => (
        <Link to={`/devices/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.id}
        </Link>
      ),
    },
    { accessorKey: 'name', header: 'Device Name' },
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'location', header: 'Location' },
    { accessorKey: 'firmwareVersion', header: 'Firmware' },
    {
      accessorKey: 'wifiSsid',
      header: 'WiFi',
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {row.original.wifiSignal > 0 ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-danger" />}
          {row.original.wifiSsid || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <DeviceStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'lastSync',
      header: 'Last Sync',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelativeTime(row.original.lastSync)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const device = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View">
              <Link to={`/devices/${device.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => onEdit(device)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Restart">
                  <RotateCw className="h-4 w-4" />
                </Button>
              }
              variant="default"
              title="Restart device?"
              description={`This will send a remote restart command to ${device.name} (${device.id}). The device will briefly go offline.`}
              confirmLabel="Restart"
              onConfirm={() => onRestart(device)}
            />
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
              title="Delete device?"
              description={`This will permanently remove ${device.name} (${device.id}) and its historical data. This action cannot be undone.`}
              confirmLabel="Delete"
              onConfirm={() => onDelete(device)}
            />
          </div>
        );
      },
    },
  ];
}
