import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { TrendChart } from '@/components/charts/TrendChart';
import { AqiDonut } from '@/components/charts/AqiDonut';
import { MachineSelect } from '@/components/shared/MachineSelect';
import { sensorService } from '@/services/sensorService';
import { SENSOR_META, type SensorParameter } from '@/constants/sensorMeta';
import { aqiBandFor } from '@/constants/aqi';
import { formatTime } from '@/utils/format';
import { cn } from '@/lib/utils';

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const [machineId, setMachineId] = useState('');
  const [parameter, setParameter] = useState<SensorParameter>('PM2.5');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [compareKeys, setCompareKeys] = useState<SensorParameter[]>(['PM2.5', 'PM10']);

  const meta = SENSOR_META.find((s) => s.key === parameter)!;

  const historyQuery = useQuery({
    queryKey: ['analytics-history', machineId, from, to],
    queryFn: () => sensorService.getHistory(machineId, new Date(from).toISOString(), new Date(`${to}T23:59:59`).toISOString()),
    enabled: !!machineId,
  });

  const barData = (historyQuery.data ?? []).map((r) => ({ timestamp: r.recordedAt, value: r[meta.field] ?? 0 }));
  const compareSeries = SENSOR_META.filter((s) => compareKeys.includes(s.key));

  const aqiValues = (historyQuery.data ?? []).map((r) => r.aqi).filter((v): v is number => v != null);
  const aqiBandCounts = aqiValues.reduce<Record<string, number>>((acc, v) => {
    const band = aqiBandFor(v).label;
    acc[band] = (acc[band] ?? 0) + 1;
    return acc;
  }, {});
  const aqiAverage = aqiValues.length ? aqiValues.reduce((sum, v) => sum + v, 0) / aqiValues.length : 0;

  const toggleCompare = (key: SensorParameter) => {
    setCompareKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" description="Analyze historical air quality data for your machine." />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[200px] space-y-2">
            <Label>Machine</Label>
            <MachineSelect value={machineId} onChange={setMachineId} />
          </div>
          <div className="min-w-[160px] space-y-2">
            <Label>Parameter</Label>
            <Select value={parameter} onValueChange={(v) => setParameter(v as SensorParameter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENSOR_META.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => historyQuery.refetch()}>
            Apply
          </Button>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant={chartType === 'line' ? 'default' : 'outline'} onClick={() => setChartType('line')}>
              <LineChartIcon className="h-3.5 w-3.5" />
              Line Chart
            </Button>
            <Button size="sm" variant={chartType === 'bar' ? 'default' : 'outline'} onClick={() => setChartType('bar')}>
              <BarChart3 className="h-3.5 w-3.5" />
              Bar Chart
            </Button>
          </div>
        </CardContent>
      </Card>

      {!machineId ? (
        <EmptyState title="Select a machine" description="Choose a machine above to view its analytics." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {meta.label} ({meta.unit})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyQuery.isLoading ? (
                  <CardSkeleton className="h-72 w-full" />
                ) : historyQuery.isError ? (
                  <ErrorState onRetry={() => historyQuery.refetch()} />
                ) : !historyQuery.data?.length ? (
                  <EmptyState title="No data in this range" />
                ) : chartType === 'line' ? (
                  <TrendChart data={historyQuery.data} series={[meta]} />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis dataKey="timestamp" tickFormatter={(v) => formatTime(v)} tick={{ fontSize: 11 }} minTickGap={40} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip labelFormatter={(v) => formatTime(v as string)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" name={`${meta.label} (${meta.unit})`} fill={meta.color} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AQI Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {historyQuery.isLoading ? (
                  <CardSkeleton className="h-72 w-full" />
                ) : historyQuery.isError ? (
                  <ErrorState onRetry={() => historyQuery.refetch()} />
                ) : !aqiValues.length ? (
                  <EmptyState title="No AQI data in this range" />
                ) : (
                  <AqiDonut average={aqiAverage} bandCounts={aqiBandCounts} total={aqiValues.length} />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {SENSOR_META.filter((s) => s.key !== 'AQI').map((s) => (
                  <button
                    key={s.key}
                    onClick={() => toggleCompare(s.key)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      compareKeys.includes(s.key) ? 'border-transparent text-white' : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                    style={compareKeys.includes(s.key) ? { backgroundColor: s.color } : undefined}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {historyQuery.data?.length ? (
                <TrendChart data={historyQuery.data} series={compareSeries} />
              ) : (
                <EmptyState title="No data to compare" />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
