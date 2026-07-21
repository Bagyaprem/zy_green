import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Building2,
  Cpu,
  HeartPulse,
  PlugZap,
  Users,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { KpiTile } from '@/components/shared/KpiTile';
import { KpiSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRangeSelector } from '@/components/shared/TimeRangeSelector';
import { TrendChart } from '@/components/charts/TrendChart';
import { DoughnutStatus } from '@/components/charts/DoughnutStatus';
import { DeviceStatusBadge, AlertSeverityBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { analyticsService } from '@/services/analyticsService';
import { alertService } from '@/services/alertService';
import { activityLogService } from '@/services/activityLogService';
import { SENSOR_PARAMETERS } from '@/constants/options';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { formatNumber, formatRelativeTime } from '@/utils/format';
import type { SensorParameter } from '@/types';

const kpiIconMap = [
  { key: 'totalDevices', label: 'Total Devices', icon: Cpu, tone: 'primary' as const },
  { key: 'onlineDevices', label: 'Online', icon: PlugZap, tone: 'success' as const },
  { key: 'offlineDevices', label: 'Offline', icon: WifiOff, tone: 'danger' as const },
  { key: 'disconnectedDevices', label: 'Disconnected', icon: WifiOff, tone: 'default' as const },
  { key: 'activeAlerts', label: 'Active Alerts', icon: AlertTriangle, tone: 'warning' as const },
  { key: 'totalCustomers', label: 'Customers', icon: Building2, tone: 'info' as const },
  { key: 'totalUsers', label: 'Users', icon: Users, tone: 'info' as const },
  { key: 'avgDeviceHealth', label: 'Avg Device Health', icon: HeartPulse, tone: 'success' as const },
];

export function DashboardPage() {
  const { timeRange, setTimeRange, customFrom, customTo, setCustomRange } = useAnalyticsStore();
  const [parameter, setParameter] = useState<SensorParameter>('AQI');

  const kpis = useQuery({ queryKey: ['dashboard-kpis'], queryFn: analyticsService.getDashboardKpis });
  const statusBreakdown = useQuery({ queryKey: ['device-status-breakdown'], queryFn: analyticsService.getDeviceStatusBreakdown });
  const recentAlerts = useQuery({ queryKey: ['recent-alerts'], queryFn: () => alertService.getRecentAlerts(5) });
  const recentActivity = useQuery({ queryKey: ['recent-activity'], queryFn: () => activityLogService.getRecent(6) });
  const topDevices = useQuery({ queryKey: ['top-devices'], queryFn: () => analyticsService.getTopDevices(5) });
  const sensorMeta = useQuery({ queryKey: ['sensor-meta'], queryFn: analyticsService.getSensorMeta });

  const trend = useQuery({
    queryKey: ['fleet-trend', parameter, timeRange, customFrom, customTo],
    queryFn: () => analyticsService.getFleetTrend(parameter, timeRange, { from: customFrom, to: customTo }),
  });
  const summary = useQuery({
    queryKey: ['fleet-summary', parameter, timeRange, customFrom, customTo],
    queryFn: () => analyticsService.getFleetSummary(parameter, timeRange, { from: customFrom, to: customTo }),
  });

  const meta = sensorMeta.data?.find((m) => m.key === parameter);
  const total = statusBreakdown.data?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Fleet-wide overview of your ZYGREEN IoT device network." />

      {kpis.isLoading ? (
        <KpiSkeleton />
      ) : kpis.isError ? (
        <ErrorState onRetry={() => kpis.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {kpiIconMap.map((k) => (
            <KpiTile
              key={k.key}
              label={k.label}
              value={
                k.key === 'avgDeviceHealth'
                  ? `${kpis.data?.[k.key as keyof typeof kpis.data]}%`
                  : formatNumber(Number(kpis.data?.[k.key as keyof typeof kpis.data] ?? 0))
              }
              icon={k.icon}
              tone={k.tone}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Device Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.isLoading ? (
              <CardSkeleton className="h-56 w-full" />
            ) : statusBreakdown.isError ? (
              <ErrorState onRetry={() => statusBreakdown.refetch()} />
            ) : (
              <>
                <DoughnutStatus data={statusBreakdown.data ?? []} total={total} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {statusBreakdown.data?.map((s) => (
                    <div key={s.status} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-muted-foreground">{s.status}</span>
                      <span className="ml-auto font-medium text-foreground">{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Latest Alerts</CardTitle>
            <Link to="/alerts" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentAlerts.isLoading ? (
              <CardSkeleton className="h-56 w-full" />
            ) : recentAlerts.isError ? (
              <ErrorState onRetry={() => recentAlerts.refetch()} />
            ) : recentAlerts.data?.length === 0 ? (
              <EmptyState title="No alerts" description="Your fleet is running clean right now." />
            ) : (
              <div className="space-y-1">
                {recentAlerts.data?.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.deviceId} &middot; {formatRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                    <AlertSeverityBadge severity={alert.severity} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <div>
            <CardTitle>Device Trend (Fleet Average)</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={parameter} onValueChange={(v) => setParameter(v as SensorParameter)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
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
          </div>
        </CardHeader>
        <CardContent>
          {trend.isLoading ? (
            <CardSkeleton className="h-80 w-full" />
          ) : trend.isError ? (
            <ErrorState onRetry={() => trend.refetch()} />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <TrendChart data={trend.data ?? []} color={meta?.color} unit={meta?.unit} />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                {[
                  { label: 'Average', value: summary.data?.average },
                  { label: 'Minimum', value: summary.data?.min },
                  { label: 'Maximum', value: summary.data?.max },
                  { label: 'Current', value: summary.data?.current },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatNumber(s.value ?? 0, meta?.key === 'TVOC' ? 2 : 1)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{meta?.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.isLoading ? (
              <CardSkeleton className="h-48 w-full" />
            ) : recentActivity.isError ? (
              <ErrorState onRetry={() => recentActivity.refetch()} />
            ) : (
              <ul className="space-y-3">
                {recentActivity.data?.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-foreground">
                        <span className="font-medium">{log.actor}</span> {log.action} <span className="font-medium">{log.entityName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(log.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Devices by Health</CardTitle>
          </CardHeader>
          <CardContent>
            {topDevices.isLoading ? (
              <CardSkeleton className="h-48 w-full" />
            ) : topDevices.isError ? (
              <ErrorState onRetry={() => topDevices.refetch()} />
            ) : (
              <div className="space-y-1">
                {topDevices.data?.map((device) => (
                  <Link
                    key={device.id}
                    to={`/devices/${device.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{device.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.id} &middot; {device.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">{device.health}%</Badge>
                      <DeviceStatusBadge status={device.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
