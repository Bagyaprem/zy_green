import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Machine } from '@/types';
import { formatDate } from '@/utils/format';

interface MachineColumnActions {
  onEdit: (machine: Machine) => void;
  onDelete: (machine: Machine) => void;
}

const WIFI_STATUS_VARIANT: Record<NonNullable<Machine['wifiStatus']>, 'success' | 'danger' | 'warning'> = {
  Connected: 'success',
  Disconnected: 'danger',
  Connecting: 'warning',
};

export function buildMachineColumns({ onEdit, onDelete }: MachineColumnActions): ColumnDef<Machine>[] {
  return [
    {
      accessorKey: 'machineCode',
      header: 'Machine Code',
      cell: ({ row }) => (
        <Link to={`/machines/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.original.machineCode}
        </Link>
      ),
    },
    { accessorKey: 'machineName', header: 'Machine Name' },
    { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => row.original.customerName || '-' },
    { accessorKey: 'location', header: 'Location', cell: ({ row }) => row.original.location || '-' },
    {
      accessorKey: 'wifiStatus',
      header: 'WiFi Status',
      cell: ({ row }) =>
        row.original.wifiStatus ? (
          <Badge variant={WIFI_STATUS_VARIANT[row.original.wifiStatus]}>{row.original.wifiStatus}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Machine Status',
      cell: ({ row }) => <Badge variant={row.original.status === 'Active' ? 'success' : 'muted'}>{row.original.status}</Badge>,
    },
    {
      accessorKey: 'firmwareVersion',
      header: 'Firmware Version',
      cell: ({ row }) => row.original.firmwareVersion || '-',
    },
    { accessorKey: 'createdAt', header: 'Created Date', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const machine = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View">
              <Link to={`/machines/${machine.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => onEdit(machine)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
              title="Delete machine?"
              // Every satellite table FKs to machines with `on delete cascade`,
              // so this destroys far more than the row itself - say so plainly
              // rather than letting "and its historical data" imply just readings.
              description={`This will permanently delete ${machine.machineName} (${machine.machineCode}) and everything attached to it: all sensor readings, its WiFi configuration, status and firmware records, alerts, logs, and any generated reports. This action cannot be undone.`}
              confirmLabel="Delete"
              onConfirm={() => onDelete(machine)}
            />
          </div>
        );
      },
    },
  ];
}
