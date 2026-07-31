import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, Cloud, Activity, Droplets, Thermometer, Wind, Radio } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { CardSkeleton, KpiSkeleton } from '@/components/shared/TableSkeleton';
import { DataTable } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { SensorReadingCard } from '@/components/shared/SensorReadingCard';
import { TrendChart } from '@/components/charts/TrendChart';
import { machineService } from '@/services/machineService';
import { sensorService } from '@/services/sensorService';
import { SENSOR_META, type SensorParameter } from '@/constants/sensorMeta';
import { aqiBandFor, statusFor } from '@/constants/aqi';
import { rangeFromKey, type TimeRangeKey } from '@/utils/timeRange';
import { formatDate, formatDateTime, formatNumber } from '@/utils/format';
import type { SensorReading } from '@/types';

const TREND_OPTIONS = SENSOR_META.filter((s) => s.key !== 'PM4.0');
const ALL_TREND_SERIES = SENSOR_META.filter((s) => ['PM2.5', 'PM10', 'CO2', 'Temperature', 'Humidity'].includes(s.key));
const TIME_RANGES: TimeRangeKey[] = ['1H', '6H', '12H', '24H'];

const tableColumns: ColumnDef<SensorReading>[] = [
  { accessorKey: 'recordedAt', header: 'Time', cell: ({ row }) => formatDateTime(row.original.recordedAt) },
  { accessorKey: 'pm1_0', header: 'PM1.0', cell: ({ row }) => formatNumber(row.original.pm1_0 ?? 0, 1) },
  { accessorKey: 'pm2_5', header: 'PM2.5', cell: ({ row }) => formatNumber(row.original.pm2_5 ?? 0, 1) },
  { accessorKey: 'pm10', header: 'PM10', cell: ({ row }) => formatNumber(row.original.pm10 ?? 0, 1) },
  { accessorKey: 'co2', header: 'CO2', cell: ({ row }) => formatNumber(row.original.co2 ?? 0) },
  { accessorKey: 'temperature', header: 'Temp (°C)', cell: ({ row }) => formatNumber(row.original.temperature ?? 0, 1) },
  { accessorKey: 'humidity', header: 'Humidity (%)', cell: ({ row }) => formatNumber(row.original.humidity ?? 0, 1) },
];

export function MachineDetailsPage() {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRangeKey>('24H');
  const [trendParameter, setTrendParameter] = useState<SensorParameter | 'All'>('PM2.5');
  const trendSeries = trendParameter === 'All' ? ALL_TREND_SERIES : [TREND_OPTIONS.find((s) => s.key === trendParameter) ?? TREND_OPTIONS[0]];

  const machineQuery = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => machineService.getMachine(machineId as string),
    enabled: !!machineId,
    refetchInterval: 30000,
  });

  const latestQuery = useQuery({
    queryKey: ['sensor-latest', machineId],
    queryFn: () => sensorService.getLatestReading(machineId as string),
    enabled: !!machineId,
    refetchInterval: 30000,
  });

  const trendQuery = useQuery({
    queryKey: ['sensor-trend', machineId, range],
    queryFn: () => {
      const { from, to } = rangeFromKey(range);
      return sensorService.getHistory(machineId as string, from, to);
    },
    enabled: !!machineId,
  });

  const tableQuery = useQuery({
    queryKey: ['sensor-recent', machineId],
    queryFn: () => sensorService.getRecentReadings(machineId as string, 25),
    enabled: !!machineId,
  });

  if (machineQuery.isLoading) {
    return <CardSkeleton className="h-96 w-full" />;
  }

  if (machineQuery.isError || !machineQuery.data) {
    return <ErrorState title="Machine not found" description="This machine may have been removed." onRetry={() => navigate('/machines')} />;
  }

  const machine = machineQuery.data;
  const reading = latestQuery.data;

  const rows = [
    { label: 'Machine Code', value: machine.machineCode },
    { label: 'Customer', value: machine.customerName || '-' },
    { label: 'Location', value: machine.location || '-' },
    { label: 'Firmware Version', value: machine.firmwareVersion || '-' },
    { label: 'Created', value: formatDate(machine.createdAt) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/machines')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Machines
        </Button>
        <PageHeader
          title={machine.machineName}
          description={`${machine.machineCode} · ${machine.location || 'No location set'}`}
          actions={<Badge variant={machine.status === 'Active' ? 'success' : 'muted'}>{machine.status}</Badge>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Machine Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">WiFi Status</span>
            {machine.wifiStatus ? <Badge>{machine.wifiStatus}</Badge> : <span className="text-foreground">-</span>}
          </div>
        </CardContent>
      </Card>

      {latestQuery.isLoading ? (
        <KpiSkeleton />
      ) : !reading ? (
        <EmptyState icon={Radio} title="No sensor data yet" description="This machine hasn't reported any readings yet." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
          <SensorReadingCard label="AQI" value={reading.aqi} unit="AQI" icon={Cloud} status={reading.aqi !== null ? (aqiBandFor(reading.aqi).label === 'Good' ? 'Good' : 'Warning') : 'Normal'} />
          <SensorReadingCard label="PM1.0" value={reading.pm1_0} unit="µg/m³" icon={Cloud} status="Good" decimals={1} />
          <SensorReadingCard label="PM2.5" value={reading.pm2_5} unit="µg/m³" icon={Cloud} status={statusFor('pm2_5', reading.pm2_5 ?? 0)} decimals={1} />
          <SensorReadingCard label="PM10" value={reading.pm10} unit="µg/m³" icon={Wind} status={statusFor('pm10', reading.pm10 ?? 0)} decimals={1} />
          <SensorReadingCard label="CO₂" value={reading.co2} unit="ppm" icon={Activity} status={statusFor('co2', reading.co2 ?? 0)} />
          <SensorReadingCard label="Temperature" value={reading.temperature} unit="°C" icon={Thermometer} status={statusFor('temperature', reading.temperature ?? 0)} decimals={1} />
          <SensorReadingCard label="Humidity" value={reading.humidity} unit="%" icon={Droplets} status={statusFor('humidity', reading.humidity ?? 0)} decimals={1} />
        </div>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Live Trend</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={trendParameter} onValueChange={(v) => setTrendParameter(v as SensorParameter | 'All')}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {TREND_OPTIONS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              {TIME_RANGES.map((r) => (
                <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'} className="h-7 px-2.5 text-xs" onClick={() => setRange(r)}>
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendQuery.isLoading ? (
            <CardSkeleton className="h-72 w-full" />
          ) : !trendQuery.data?.length ? (
            <EmptyState title="No readings in this window" description="Try a wider time range." />
          ) : (
            <TrendChart data={trendQuery.data} series={trendSeries} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={tableColumns}
            data={tableQuery.data ?? []}
            isLoading={tableQuery.isLoading}
            isError={tableQuery.isError}
            onRetry={() => tableQuery.refetch()}
            emptyTitle="No readings yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
