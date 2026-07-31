import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Activity, Cloud, Droplets, Radio, Thermometer, Wind } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SensorReadingCard } from '@/components/shared/SensorReadingCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { CardSkeleton, KpiSkeleton } from '@/components/shared/TableSkeleton';
import { DataTable } from '@/components/shared/DataTable';
import { TrendChart } from '@/components/charts/TrendChart';
import { machineService } from '@/services/machineService';
import { sensorService } from '@/services/sensorService';
import { SENSOR_META, type SensorParameter } from '@/constants/sensorMeta';
import { statusFor, aqiBandFor } from '@/constants/aqi';
import { rangeFromKey, type TimeRangeKey } from '@/utils/timeRange';
import { formatDateTime, formatNumber } from '@/utils/format';
import type { SensorReading } from '@/types';

const TREND_OPTIONS = SENSOR_META.filter((s) => s.key !== 'PM4.0');
const ALL_TREND_SERIES = SENSOR_META.filter((s) => ['PM2.5', 'PM10', 'CO2', 'Temperature', 'Humidity'].includes(s.key));
const TIME_RANGES: TimeRangeKey[] = ['1H', '6H', '12H', '24H'];
type RangeSelection = TimeRangeKey | 'CUSTOM';

const tableColumns: ColumnDef<SensorReading>[] = [
  { accessorKey: 'recordedAt', header: 'Time', cell: ({ row }) => formatDateTime(row.original.recordedAt) },
  { accessorKey: 'pm1_0', header: 'PM1.0', cell: ({ row }) => formatNumber(row.original.pm1_0 ?? 0, 1) },
  { accessorKey: 'pm2_5', header: 'PM2.5', cell: ({ row }) => formatNumber(row.original.pm2_5 ?? 0, 1) },
  { accessorKey: 'pm10', header: 'PM10', cell: ({ row }) => formatNumber(row.original.pm10 ?? 0, 1) },
  { accessorKey: 'co2', header: 'CO2', cell: ({ row }) => formatNumber(row.original.co2 ?? 0) },
  { accessorKey: 'temperature', header: 'Temp (°C)', cell: ({ row }) => formatNumber(row.original.temperature ?? 0, 1) },
  { accessorKey: 'humidity', header: 'Humidity (%)', cell: ({ row }) => formatNumber(row.original.humidity ?? 0, 1) },
];

export function LiveDataPage() {
  const [machineId, setMachineId] = useState('');
  const [range, setRange] = useState<RangeSelection>('24H');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [trendParameter, setTrendParameter] = useState<SensorParameter | 'All'>('PM2.5');
  const trendSeries = trendParameter === 'All' ? ALL_TREND_SERIES : [TREND_OPTIONS.find((s) => s.key === trendParameter) ?? TREND_OPTIONS[0]];

  const machinesQuery = useQuery({ queryKey: ['machines'], queryFn: () => machineService.getMachines() });
  const machines = machinesQuery.data ?? [];
  const activeMachineId = machineId || machines[0]?.id || '';

  const latestQuery = useQuery({
    queryKey: ['sensor-latest', activeMachineId],
    queryFn: () => sensorService.getLatestReading(activeMachineId),
    enabled: !!activeMachineId,
    refetchInterval: 10000,
  });

  const isCustomRange = range === 'CUSTOM';
  const trendQuery = useQuery({
    queryKey: ['sensor-trend', activeMachineId, range, customFrom, customTo],
    queryFn: () => {
      const { from, to } = isCustomRange
        ? { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() }
        : rangeFromKey(range as TimeRangeKey);
      return sensorService.getHistory(activeMachineId, from, to);
    },
    enabled: !!activeMachineId && (!isCustomRange || (!!customFrom && !!customTo)),
    refetchInterval: isCustomRange ? false : 30000,
  });

  const tableQuery = useQuery({
    queryKey: ['sensor-recent', activeMachineId],
    queryFn: () => sensorService.getRecentReadings(activeMachineId, 25),
    enabled: !!activeMachineId,
    refetchInterval: 10000,
  });

  if (machinesQuery.isLoading) return <KpiSkeleton />;
  if (machinesQuery.isError) return <ErrorState onRetry={() => machinesQuery.refetch()} />;
  if (!machines.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Live Data" description="Real-time data from your machine." />
        <EmptyState title="No machines yet" description="Machines assigned to you will show up here." />
      </div>
    );
  }

  const reading = latestQuery.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Data"
        description="Real-time sensor readings, refreshed automatically."
        actions={
          machines.length > 1 ? (
            <Select value={activeMachineId} onValueChange={setMachineId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.machineCode} · {m.machineName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

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
              <Button size="sm" variant={range === 'CUSTOM' ? 'default' : 'outline'} className="h-7 px-2.5 text-xs" onClick={() => setRange('CUSTOM')}>
                Custom
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isCustomRange && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          )}
          {trendQuery.isLoading ? (
            <CardSkeleton className="h-72 w-full" />
          ) : isCustomRange && (!customFrom || !customTo) ? (
            <EmptyState title="Pick a date range" description="Choose both a From and To date/time above." />
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
