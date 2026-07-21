import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { SensorCard } from '@/components/shared/SensorCard';
import { DeviceStatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { deviceService } from '@/services/deviceService';
import { analyticsService } from '@/services/analyticsService';
import { WifiPanel } from '@/features/wifi/WifiPanel';
import { DeviceFirmwarePanel } from '@/features/firmware/DeviceFirmwarePanel';
import { DeviceConfigForm } from '@/features/devices/DeviceConfigForm';
import { formatDateTime, formatRelativeTime } from '@/utils/format';
import type { SensorParameter } from '@/types';

const READING_KEY: Record<SensorParameter, keyof import('@/types').DeviceReadings> = {
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

export function DeviceDetailsPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const deviceQuery = useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => deviceService.getDevice(deviceId as string),
    enabled: !!deviceId,
  });

  const sensorMetaQuery = useQuery({ queryKey: ['sensor-meta'], queryFn: analyticsService.getSensorMeta });

  const logsQuery = useQuery({
    queryKey: ['device-logs', deviceId],
    queryFn: () => deviceService.getDeviceLogs(deviceId as string),
    enabled: !!deviceId,
  });

  const restartMutation = useMutation({
    mutationFn: () => deviceService.restartDevice(deviceId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      toast.success('Restart command sent');
    },
    onError: () => toast.error('Failed to restart device'),
  });

  if (deviceQuery.isLoading) {
    return <CardSkeleton className="h-96 w-full" />;
  }

  if (deviceQuery.isError || !deviceQuery.data) {
    return <ErrorState title="Device not found" description="This device may have been removed." onRetry={() => navigate('/devices')} />;
  }

  const device = deviceQuery.data;

  const statusOf = (value: number, warning: number, danger: number): 'good' | 'warning' | 'danger' => {
    if (value >= danger) return 'danger';
    if (value >= warning) return 'warning';
    return 'good';
  };

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground" onClick={() => navigate('/devices')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Devices
        </Button>
        <PageHeader
          title={device.name}
          description={`${device.id} · ${device.location}`}
          actions={
            <>
              <DeviceStatusBadge status={device.status} />
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <RotateCw className="h-4 w-4" />
                    Restart Device
                  </Button>
                }
                variant="default"
                title="Restart device?"
                description={`This will send a remote restart command to ${device.name}. The device will briefly go offline.`}
                confirmLabel="Restart"
                onConfirm={() => restartMutation.mutate()}
              />
            </>
          }
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sensors">Sensors</TabsTrigger>
          <TabsTrigger value="wifi">WiFi</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="firmware">Firmware</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Live Snapshot</CardTitle>
                <CardDescription>Most recent readings reported by this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sensorMetaQuery.data?.slice(0, 6).map((meta) => (
                    <SensorCard
                      key={meta.key}
                      label={meta.label}
                      value={device.readings[READING_KEY[meta.key]]}
                      unit={meta.unit}
                      icon={meta.icon}
                      color={meta.color}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
            <DeviceInfoPanel device={device} />
          </div>
        </TabsContent>

        <TabsContent value="sensors">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {sensorMetaQuery.data?.map((meta) => (
              <SensorCard
                key={meta.key}
                label={meta.label}
                value={device.readings[READING_KEY[meta.key]]}
                unit={meta.unit}
                icon={meta.icon}
                color={meta.color}
                status={
                  meta.key === 'CO2'
                    ? statusOf(device.readings.co2, 1000, 1500)
                    : meta.key === 'AQI'
                    ? statusOf(device.readings.aqi, 100, 150)
                    : 'good'
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wifi">
          <WifiPanel deviceId={device.id} />
        </TabsContent>

        <TabsContent value="configuration">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DeviceConfigForm device={device} />
            </div>
            <DeviceInfoPanel device={device} />
          </div>
        </TabsContent>

        <TabsContent value="firmware">
          <DeviceFirmwarePanel deviceId={device.id} />
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Device Logs</CardTitle>
              <CardDescription>Recent system events reported by this device.</CardDescription>
            </CardHeader>
            <CardContent>
              {logsQuery.isLoading ? (
                <CardSkeleton className="h-72 w-full" />
              ) : (
                <div className="space-y-2">
                  {logsQuery.data?.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                      <Badge variant={log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'muted'} className="mt-0.5">
                        {log.level}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{log.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeviceInfoPanel({ device }: { device: import('@/types').Device }) {
  const rows = [
    { label: 'Device ID', value: device.id },
    { label: 'Model', value: device.model },
    { label: 'Serial Number', value: device.serialNumber },
    { label: 'MAC Address', value: device.macAddress },
    { label: 'Firmware Version', value: device.firmwareVersion },
    { label: 'Location', value: device.location },
    { label: 'Time Zone', value: device.timezone },
    { label: 'Upload Interval', value: `${device.uploadIntervalSec}s` },
    { label: 'Last Sync', value: formatRelativeTime(device.lastSync) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <DeviceStatusBadge status={device.status} />
        </div>
      </CardContent>
    </Card>
  );
}
