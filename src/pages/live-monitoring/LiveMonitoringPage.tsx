import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SensorCard } from '@/components/shared/SensorCard';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { deviceService } from '@/services/deviceService';
import { analyticsService } from '@/services/analyticsService';
import { useInterval } from '@/hooks/useInterval';
import { appConfig } from '@/config/config';
import { formatTime } from '@/utils/format';
import type { DeviceReadings, SensorParameter, TrendPoint } from '@/types';

const READING_KEY: Record<SensorParameter, keyof DeviceReadings> = {
  AQI: 'aqi',
  'PM2.5': 'pm25',
  PM10: 'pm10',
  CO2: 'co2',
  Temperature: 'temperature',
  Humidity: 'humidity',
  TVOC: 'tvoc',
  Pressure: 'pressure',
  Light: 'light',
  Noise: 'noise',
};

const HISTORY_CAP = 24;

export function LiveMonitoringPage() {
  const [deviceId, setDeviceId] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [history, setHistory] = useState<Record<string, TrendPoint[]>>({});
  const [readings, setReadings] = useState<DeviceReadings | null>(null);

  const devicesQuery = useQuery({ queryKey: ['devices-lite'], queryFn: () => deviceService.getDevices() });
  const sensorMetaQuery = useQuery({ queryKey: ['sensor-meta'], queryFn: analyticsService.getSensorMeta });

  useEffect(() => {
    if (!deviceId && devicesQuery.data?.length) {
      const firstOnline = devicesQuery.data.find((d) => d.status === 'Online') ?? devicesQuery.data[0];
      setDeviceId(firstOnline.id);
    }
  }, [devicesQuery.data, deviceId]);

  const poll = async () => {
    if (!deviceId) return;
    const snapshot = await deviceService.getLiveSnapshot(deviceId);
    setReadings(snapshot.readings);
    setLastUpdated(new Date(snapshot.timestamp));
    setHistory((prev) => {
      const next = { ...prev };
      (Object.keys(READING_KEY) as SensorParameter[]).forEach((param) => {
        const key = READING_KEY[param];
        const value = snapshot.readings[key];
        const series = prev[param] ?? [];
        next[param] = [...series, { timestamp: snapshot.timestamp, value }].slice(-HISTORY_CAP);
      });
      return next;
    });
  };

  useEffect(() => {
    setHistory({});
    setReadings(null);
    if (deviceId) poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useInterval(poll, deviceId ? appConfig.liveRefreshIntervalMs : null);

  const selectedDevice = devicesQuery.data?.find((d) => d.id === deviceId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Monitoring"
        description="Real-time sensor telemetry streaming from the selected device."
        actions={
          <Select value={deviceId} onValueChange={setDeviceId}>
            <SelectTrigger className="w-[240px]">
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
        }
      />

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-card">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span className="text-sm font-medium text-foreground">Live</span>
          {selectedDevice && <span className="text-xs text-muted-foreground">&middot; {selectedDevice.name}</span>}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5" />
          Last updated: {lastUpdated ? formatTime(lastUpdated) : '-'}
        </span>
      </div>

      {devicesQuery.isLoading || sensorMetaQuery.isLoading || !readings ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : !deviceId ? (
        <EmptyState title="No devices available" description="Add a device to begin live monitoring." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {sensorMetaQuery.data?.map((meta) => (
            <SensorCard
              key={meta.key}
              label={meta.label}
              value={readings[READING_KEY[meta.key]]}
              unit={meta.unit}
              icon={meta.icon}
              color={meta.color}
              series={history[meta.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
