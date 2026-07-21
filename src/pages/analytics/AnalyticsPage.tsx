import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRangeSelector } from '@/components/shared/TimeRangeSelector';
import { TrendChart } from '@/components/charts/TrendChart';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { deviceService } from '@/services/deviceService';
import { analyticsService } from '@/services/analyticsService';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { SENSOR_PARAMETERS } from '@/constants/options';
import { formatNumber } from '@/utils/format';
import type { SensorParameter } from '@/types';

export function AnalyticsPage() {
  const { deviceId, parameter, timeRange, customFrom, customTo, setDeviceId, setParameter, setTimeRange, setCustomRange } =
    useAnalyticsStore();

  const devicesQuery = useQuery({ queryKey: ['devices-lite'], queryFn: () => deviceService.getDevices() });
  const sensorMetaQuery = useQuery({ queryKey: ['sensor-meta'], queryFn: analyticsService.getSensorMeta });

  useEffect(() => {
    if (!deviceId && devicesQuery.data?.length) {
      setDeviceId(devicesQuery.data[0].id);
    }
  }, [devicesQuery.data, deviceId, setDeviceId]);

  const trendQuery = useQuery({
    queryKey: ['analytics-trend', deviceId, parameter, timeRange, customFrom, customTo],
    queryFn: () => analyticsService.getTrend(deviceId, parameter, timeRange, { from: customFrom, to: customTo }),
    enabled: !!deviceId,
  });

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', deviceId, parameter, timeRange, customFrom, customTo],
    queryFn: () => analyticsService.getSummary(deviceId, parameter, timeRange, { from: customFrom, to: customTo }),
    enabled: !!deviceId,
  });

  const meta = sensorMetaQuery.data?.find((m) => m.key === parameter);
  const selectedDevice = devicesQuery.data?.find((d) => d.id === deviceId);

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" description="Deep-dive into historical sensor trends for any device." />

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
          <Select value={parameter} onValueChange={(v) => setParameter(v as SensorParameter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select parameter" />
            </SelectTrigger>
            <SelectContent>
              {SENSOR_PARAMETERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} customFrom={customFrom} customTo={customTo} onCustomChange={setCustomRange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {meta?.label ?? parameter} Trend {selectedDevice ? `- ${selectedDevice.name}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendQuery.isLoading ? (
            <CardSkeleton className="h-96 w-full" />
          ) : trendQuery.isError ? (
            <ErrorState onRetry={() => trendQuery.refetch()} />
          ) : (
            <TrendChart data={trendQuery.data ?? []} color={meta?.color} unit={meta?.unit} height={380} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Average', value: summaryQuery.data?.average },
          { label: 'Minimum', value: summaryQuery.data?.min },
          { label: 'Maximum', value: summaryQuery.data?.max },
          { label: 'Current', value: summaryQuery.data?.current },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1.5 text-2xl font-semibold text-foreground">
                {formatNumber(s.value ?? 0, meta?.key === 'TVOC' ? 2 : 1)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{meta?.unit}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
