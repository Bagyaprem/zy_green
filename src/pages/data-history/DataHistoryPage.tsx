import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { deviceService } from '@/services/deviceService';
import { analyticsService } from '@/services/analyticsService';
import { exportToCsv } from '@/utils/csv';
import { formatDateTime } from '@/utils/format';
import type { HistoryRow } from '@/types';

function defaultDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const columns: ColumnDef<HistoryRow>[] = [
  { accessorKey: 'timestamp', header: 'Timestamp', cell: ({ row }) => formatDateTime(row.original.timestamp) },
  { accessorKey: 'aqi', header: 'AQI' },
  { accessorKey: 'pm25', header: 'PM2.5 (ug/m3)' },
  { accessorKey: 'pm10', header: 'PM10 (ug/m3)' },
  { accessorKey: 'co2', header: 'CO2 (ppm)' },
  { accessorKey: 'temperature', header: 'Temp (C)' },
  { accessorKey: 'humidity', header: 'Humidity (%)' },
  { accessorKey: 'tvoc', header: 'TVOC (ppm)' },
  { accessorKey: 'pressure', header: 'Pressure (hPa)' },
];

export function DataHistoryPage() {
  const [deviceId, setDeviceId] = useState('');
  const [from, setFrom] = useState(defaultDate(1));
  const [to, setTo] = useState(defaultDate(0));

  const devicesQuery = useQuery({ queryKey: ['devices-lite'], queryFn: () => deviceService.getDevices() });

  useEffect(() => {
    if (!deviceId && devicesQuery.data?.length) setDeviceId(devicesQuery.data[0].id);
  }, [devicesQuery.data, deviceId]);

  const historyQuery = useQuery({
    queryKey: ['history', deviceId, from, to],
    queryFn: () => analyticsService.getHistory(deviceId, from, to),
    enabled: !!deviceId,
  });

  const handleExport = () => {
    if (!historyQuery.data?.length) return;
    exportToCsv(
      `zygreen-history-${deviceId}`,
      historyQuery.data.map((r) => ({
        Timestamp: formatDateTime(r.timestamp),
        AQI: r.aqi,
        'PM2.5': r.pm25,
        PM10: r.pm10,
        CO2: r.co2,
        Temperature: r.temperature,
        Humidity: r.humidity,
        TVOC: r.tvoc,
        Pressure: r.pressure,
      }))
    );
    toast.success('History exported as CSV');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Data History" description="Browse raw sensor readings for any device and time window." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Select value={deviceId} onValueChange={setDeviceId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {devicesQuery.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.id} &middot; {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
          </div>
          <Button variant="outline" className="ml-auto" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={historyQuery.data ?? []}
            isLoading={historyQuery.isLoading}
            isError={historyQuery.isError}
            onRetry={() => historyQuery.refetch()}
            emptyTitle="No readings found"
            emptyDescription="Try selecting a different device or date range."
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
