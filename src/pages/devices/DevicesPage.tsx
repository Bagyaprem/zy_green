import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { deviceService } from '@/services/deviceService';
import { customerService } from '@/services/customerService';
import { useDeviceStore } from '@/store/deviceStore';
import { useDebounce } from '@/hooks/useDebounce';
import { buildDeviceColumns } from '@/features/devices/deviceColumns';
import { AddDeviceDialog } from '@/features/devices/AddDeviceDialog';
import { EditDeviceDialog } from '@/features/devices/EditDeviceDialog';
import { exportToCsv } from '@/utils/csv';
import { exportToPdf } from '@/utils/pdf';
import { formatDateTime } from '@/utils/format';
import { DEVICE_STATUS_OPTIONS } from '@/constants/options';
import type { Device } from '@/types';

export function DevicesPage() {
  const [searchParams] = useSearchParams();
  const { search, status, customerId, location, setSearch, setStatus, setCustomerId, setLocation } = useDeviceStore();
  const debouncedSearch = useDebounce(search, 250);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: customers = [] } = useQuery({ queryKey: ['customers-lite'], queryFn: () => customerService.getCustomers() });
  const { data: locations = [] } = useQuery({ queryKey: ['device-locations'], queryFn: deviceService.getLocations });

  const devicesQuery = useQuery({
    queryKey: ['devices', debouncedSearch, status, customerId, location],
    queryFn: () => deviceService.getDevices({ search: debouncedSearch, status, customerId, location }),
  });

  const deleteMutation = useMutation({
    mutationFn: deviceService.deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      toast.success('Device deleted');
    },
    onError: () => toast.error('Failed to delete device'),
  });

  const restartMutation = useMutation({
    mutationFn: deviceService.restartDevice,
    onSuccess: (device) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success(`Restart command sent to ${device.name}`);
    },
    onError: () => toast.error('Failed to restart device'),
  });

  const columns = buildDeviceColumns({
    onEdit: setEditingDevice,
    onDelete: (device) => deleteMutation.mutate(device.id),
    onRestart: (device) => restartMutation.mutate(device.id),
  });

  const handleExportCsv = () => {
    if (!devicesQuery.data?.length) return;
    exportToCsv(
      'zygreen-devices',
      devicesQuery.data.map((d) => ({
        DeviceID: d.id,
        Name: d.name,
        Customer: d.customerName,
        Location: d.location,
        Firmware: d.firmwareVersion,
        Status: d.status,
        LastSync: formatDateTime(d.lastSync),
      }))
    );
    toast.success('Devices exported as CSV');
  };

  const handleExportPdf = () => {
    if (!devicesQuery.data?.length) return;
    exportToPdf(
      'zygreen-devices',
      'ZYGREEN Device Report',
      devicesQuery.data.map((d) => ({
        'Device ID': d.id,
        Name: d.name,
        Customer: d.customerName,
        Location: d.location,
        Firmware: d.firmwareVersion,
        Status: d.status,
        'Last Sync': formatDateTime(d.lastSync),
      }))
    );
    toast.success('Devices exported as PDF');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Devices"
        description="Manage every ZYGREEN monitor across your customer fleet."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <AddDeviceDialog />
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by device, customer, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {DEVICE_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
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
            data={devicesQuery.data ?? []}
            isLoading={devicesQuery.isLoading}
            isError={devicesQuery.isError}
            onRetry={() => devicesQuery.refetch()}
            emptyTitle="No devices found"
            emptyDescription="Try adjusting your search or filters, or add a new device to get started."
            enableColumnVisibility
          />
        </CardContent>
      </Card>

      <EditDeviceDialog device={editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)} />
    </div>
  );
}
