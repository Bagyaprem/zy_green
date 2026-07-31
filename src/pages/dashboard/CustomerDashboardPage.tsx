import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Building2, Cloud, Droplets, FileText, Thermometer, Wind } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SensorReadingCard } from '@/components/shared/SensorReadingCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { CardSkeleton, KpiSkeleton } from '@/components/shared/TableSkeleton';
import { TrendChart } from '@/components/charts/TrendChart';
import { machineService } from '@/services/machineService';
import { sensorService } from '@/services/sensorService';
import { reportService } from '@/services/reportService';
import { SENSOR_META, type SensorParameter } from '@/constants/sensorMeta';
import { aqiBandFor, statusFor } from '@/constants/aqi';
import { rangeFromKey, type TimeRangeKey } from '@/utils/timeRange';
import { formatDateTime, formatNumber, formatUptime } from '@/utils/format';

const TREND_OPTIONS = SENSOR_META.filter((s) => s.key !== 'PM4.0');
const ALL_TREND_SERIES = SENSOR_META.filter((s) => ['PM2.5', 'PM10', 'CO2', 'Temperature', 'Humidity'].includes(s.key));
const TIME_RANGES: TimeRangeKey[] = ['1H', '6H', '12H', '24H'];

export function CustomerDashboardPage() {
  const [machineId, setMachineId] = useState('');
  const [range, setRange] = useState<TimeRangeKey>('24H');
  const [trendParameter, setTrendParameter] = useState<SensorParameter | 'All'>('PM2.5');
  const trendSeries = trendParameter === 'All' ? ALL_TREND_SERIES : [TREND_OPTIONS.find((s) => s.key === trendParameter) ?? TREND_OPTIONS[0]];

  const machinesQuery = useQuery({ queryKey: ['machines'], queryFn: () => machineService.getMachines(), refetchInterval: 30000 });
  const machines = machinesQuery.data ?? [];
  const activeMachineId = machineId || machines[0]?.id || '';
  const machine = machines.find((m) => m.id === activeMachineId);

  const latestQuery = useQuery({
    queryKey: ['sensor-latest', activeMachineId],
    queryFn: () => sensorService.getLatestReading(activeMachineId),
    enabled: !!activeMachineId,
    refetchInterval: 30000,
  });

  const trendQuery = useQuery({
    queryKey: ['sensor-trend', activeMachineId, range],
    queryFn: () => {
      const { from, to } = rangeFromKey(range);
      return sensorService.getHistory(activeMachineId, from, to);
    },
    enabled: !!activeMachineId,
  });

  const reportsQuery = useQuery({ queryKey: ['report-requests'], queryFn: reportService.getReportRequests });

  if (machinesQuery.isLoading) return <KpiSkeleton />;
  if (machinesQuery.isError) return <ErrorState onRetry={() => machinesQuery.refetch()} />;
  if (!machines.length) {
    return (
      <div className="space-y-5">
        <PageHeader title="Dashboard" description="Overview of your air quality in real time." />
        <EmptyState icon={Building2} title="No machines yet" description="Machines assigned to you will show up here." />
      </div>
    );
  }

  const reading = latestQuery.data;

  const summaryRows = [
    { field: 'pm2_5', label: 'PM2.5', value: reading?.pm2_5, unit: 'µg/m³' },
    { field: 'pm10', label: 'PM10', value: reading?.pm10, unit: 'µg/m³' },
    { field: 'co2', label: 'CO₂', value: reading?.co2, unit: 'ppm' },
    { field: 'temperature', label: 'Temperature', value: reading?.temperature, unit: '°C' },
    { field: 'humidity', label: 'Humidity', value: reading?.humidity, unit: '%' },
  ];

  const latestReport = reportsQuery.data?.[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${machine?.customerName ?? 'there'}!`}
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
        <EmptyState title="No sensor data yet" description="This machine hasn't reported any readings yet." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
          <SensorReadingCard label="Air Quality Index" value={reading.aqi} unit="AQI" icon={Cloud} status={reading.aqi !== null ? (aqiBandFor(reading.aqi).label === 'Good' ? 'Good' : 'Warning') : 'Normal'} />
          <SensorReadingCard label="PM1.0" value={reading.pm1_0} unit="µg/m³" icon={Cloud} status="Good" decimals={1} />
          <SensorReadingCard label="PM2.5" value={reading.pm2_5} unit="µg/m³" icon={Cloud} status={statusFor('pm2_5', reading.pm2_5 ?? 0)} decimals={1} />
          <SensorReadingCard label="PM10" value={reading.pm10} unit="µg/m³" icon={Wind} status={statusFor('pm10', reading.pm10 ?? 0)} decimals={1} />
          <SensorReadingCard label="CO₂" value={reading.co2} unit="ppm" icon={Activity} status={statusFor('co2', reading.co2 ?? 0)} />
          <SensorReadingCard label="Temperature" value={reading.temperature} unit="°C" icon={Thermometer} status={statusFor('temperature', reading.temperature ?? 0)} decimals={1} />
          <SensorReadingCard label="Humidity" value={reading.humidity} unit="%" icon={Droplets} status={statusFor('humidity', reading.humidity ?? 0)} decimals={1} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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
            ) : trendQuery.isError ? (
              <ErrorState onRetry={() => trendQuery.refetch()} />
            ) : !trendQuery.data?.length ? (
              <EmptyState title="No readings in this window" description="Try a wider time range." />
            ) : (
              <TrendChart data={trendQuery.data} series={trendSeries} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Machine Status', value: machine?.isOnline ? 'Online' : 'Offline', tone: machine?.isOnline ? 'success' : 'danger' },
              { label: 'Wi-Fi Status', value: machine?.wifiStatus ?? 'Disconnected', tone: machine?.wifiStatus === 'Connected' ? 'success' : 'danger' },
              { label: 'Sensor Status', value: machine?.sensorStatus ?? 'Unknown', tone: 'info' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <Badge variant={s.tone as 'success' | 'danger' | 'info'}>{s.value}</Badge>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium text-foreground">{formatUptime(machine?.uptimeSeconds ?? 0)}</span>
            </div>

            <div className="mt-2 space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Machine Details</p>
              {[
                { label: 'Machine Name', value: machine?.machineName },
                { label: 'Machine UID', value: machine?.machineCode },
                { label: 'Firmware Version', value: machine?.firmwareVersion ?? '-' },
                { label: 'Location', value: machine?.location || '-' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Air Quality Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!reading ? (
              <EmptyState title="No readings yet" />
            ) : (
              <div className="space-y-2.5">
                {summaryRows.map((row) => (
                  <div key={row.field} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-foreground">
                      {formatNumber(row.value ?? 0, 1)} {row.unit}
                    </span>
                    <Badge variant={statusFor(row.field, row.value ?? 0) === 'Good' ? 'success' : statusFor(row.field, row.value ?? 0) === 'Warning' ? 'warning' : statusFor(row.field, row.value ?? 0) === 'Critical' ? 'danger' : 'success'}>
                      {statusFor(row.field, row.value ?? 0)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Report</CardTitle>
          </CardHeader>
          <CardContent>
            {reportsQuery.isLoading ? (
              <CardSkeleton className="h-32 w-full" />
            ) : !latestReport ? (
              <EmptyState icon={FileText} title="No reports yet" description="Request one from the Reports page." />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{latestReport.reportType} Report</p>
                    <p className="text-xs text-muted-foreground">Generated {formatDateTime(latestReport.requestedAt)}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/reports">View</Link>
                </Button>
              </div>
            )}
            <div className="mt-3 text-right">
              <Link to="/reports" className="text-xs font-medium text-primary hover:underline">
                View All Reports →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
