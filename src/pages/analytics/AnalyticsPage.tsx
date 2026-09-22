import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
import { axisTickGap, formatAxisTick, formatDateTime, seriesSpanMs } from '@/utils/format';
import { dayRangeToIso } from '@/utils/timeRange';
import { downsample, CHART_DISPLAY_POINTS } from '@/utils/downsample';
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
    queryFn: () => {
      const range = dayRangeToIso(from, to);
      return sensorService.getAllHistory(machineId, range.from, range.to);
    },
    enabled: !!machineId,
    // A date range that has already elapsed doesn't change, so re-paging tens
    // of thousands of rows to redraw an identical chart is the slowest thing
    // this page can do. Apply still forces a refetch on demand.
    staleTime: 5 * 60_000,
    // Keep the current chart on screen while a new range loads instead of
    // collapsing to a skeleton - the old data stays truthful until replaced.
    placeholderData: keepPreviousData,
  });

  /**
   * Everything below walks the full result set - tens of thousands of rows for
   * a multi-day range. Without memos these all re-ran on every render, so
   * flipping to the bar chart or toggling one Data Comparison pill re-crunched
   * the entire history several times over before React could paint. They only
   * actually change when the query data does.
   */
  const rows = historyQuery.data;

  // AQI stats are computed over every row; only what gets drawn is thinned.
  const chartRows = useMemo(() => downsample(rows ?? [], CHART_DISPLAY_POINTS), [rows]);

  // null means the sensor reported nothing at that timestamp, which is not the
  // same as reading zero - coercing it drew a bar at the floor and made a gap
  // in the data look like a genuine 0 µg/m³ measurement. The line chart already
  // passes null through (TrendChart) so it breaks the line; do the same here.
  // Cheap by comparison: chartRows is already capped at CHART_DISPLAY_POINTS.
  const barData = useMemo(
    () => chartRows.map((r) => ({ timestamp: r.recordedAt, value: r[meta.field] })),
    [chartRows, meta.field]
  );

  // Span of the data actually returned, not of the picked dates - if the
  // machine only reported for part of the range, the axis should label what
  // is on screen.
  const spanMs = useMemo(() => seriesSpanMs((rows ?? []).map((r) => r.recordedAt)), [rows]);

  const compareSeries = useMemo(() => SENSOR_META.filter((s) => compareKeys.includes(s.key)), [compareKeys]);

  // One pass for all three AQI figures instead of a map, a filter, a reduce
  // and another reduce over the same rows.
  const { aqiCount, aqiBandCounts, aqiAverage } = useMemo(() => {
    const bandCounts: Record<string, number> = {};
    let sum = 0;
    let count = 0;

    for (const r of rows ?? []) {
      if (r.aqi == null) continue;
      const band = aqiBandFor(r.aqi).label;
      bandCounts[band] = (bandCounts[band] ?? 0) + 1;
      sum += r.aqi;
      count++;
    }

    return { aqiCount: count, aqiBandCounts: bandCounts, aqiAverage: count ? sum / count : 0 };
  }, [rows]);

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
                  <TrendChart data={chartRows} series={[meta]} />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                      <XAxis dataKey="timestamp" tickFormatter={(v) => formatAxisTick(v, spanMs)} tick={{ fontSize: 11 }} minTickGap={axisTickGap(spanMs)} />
                      <YAxis tick={{ fontSize: 11 }} width={36} />
                      <Tooltip labelFormatter={(v) => formatDateTime(v as string)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
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
                ) : !aqiCount ? (
                  <EmptyState title="No AQI data in this range" />
                ) : (
                  <AqiDonut average={aqiAverage} bandCounts={aqiBandCounts} total={aqiCount} />
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
                <TrendChart data={chartRows} series={compareSeries} />
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
