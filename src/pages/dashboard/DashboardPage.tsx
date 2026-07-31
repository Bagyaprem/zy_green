import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Building2, Cpu, PlugZap, WifiOff } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { KpiTile } from '@/components/shared/KpiTile';
import { KpiSkeleton, CardSkeleton } from '@/components/shared/TableSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyticsService } from '@/services/analyticsService';
import { machineAlertService } from '@/services/machineAlertService';
import { machineLogService } from '@/services/machineLogService';
import { formatRelativeTime } from '@/utils/format';

const FLEET_STATUS_COLORS = { online: '#22C55E', offline: '#EF4444' };

const kpiIconMap = [
  { key: 'totalMachines', label: 'Total Machines', icon: Cpu, tone: 'primary' as const },
  { key: 'onlineMachines', label: 'Online', icon: PlugZap, tone: 'success' as const },
  { key: 'offlineMachines', label: 'Offline', icon: WifiOff, tone: 'danger' as const },
  { key: 'activeAlerts', label: 'Active Alerts', icon: AlertTriangle, tone: 'warning' as const },
  { key: 'totalCustomers', label: 'Customers', icon: Building2, tone: 'info' as const },
];

export function DashboardPage() {
  const kpis = useQuery({ queryKey: ['dashboard-kpis'], queryFn: analyticsService.getDashboardKpis });
  const recentAlerts = useQuery({ queryKey: ['recent-alerts'], queryFn: () => machineAlertService.getRecentAlerts(5) });
  const recentActivity = useQuery({ queryKey: ['recent-activity'], queryFn: () => machineLogService.getRecent(6) });

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description="Fleet-wide overview of your ZYGREEN machine network." />

      {kpis.isLoading ? (
        <KpiSkeleton />
      ) : kpis.isError ? (
        <ErrorState onRetry={() => kpis.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {kpiIconMap.map((k) => (
            <KpiTile
              key={k.key}
              label={k.label}
              value={String(kpis.data?.[k.key as keyof typeof kpis.data] ?? 0)}
              icon={k.icon}
              tone={k.tone}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.isLoading ? (
              <CardSkeleton className="h-64 w-full" />
            ) : kpis.isError ? (
              <ErrorState onRetry={() => kpis.refetch()} />
            ) : !kpis.data?.totalMachines ? (
              <EmptyState icon={Cpu} title="No machines yet" description="Add a machine to see fleet status here." />
            ) : (
              <div className="space-y-4">
                <div className="relative mx-auto h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Online', value: kpis.data.onlineMachines },
                          { name: 'Offline', value: kpis.data.offlineMachines },
                        ]}
                        dataKey="value"
                        innerRadius={64}
                        outerRadius={88}
                        paddingAngle={kpis.data.onlineMachines && kpis.data.offlineMachines ? 3 : 0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill={FLEET_STATUS_COLORS.online} />
                        <Cell fill={FLEET_STATUS_COLORS.offline} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{kpis.data.totalMachines}</span>
                    <span className="text-[10px] text-muted-foreground">Total Machines</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FLEET_STATUS_COLORS.online }} />
                      Online
                    </span>
                    <span className="font-semibold text-foreground">{kpis.data.onlineMachines}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FLEET_STATUS_COLORS.offline }} />
                      Offline
                    </span>
                    <span className="font-semibold text-foreground">{kpis.data.offlineMachines}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Alerts</CardTitle>
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
                          {alert.machineName} &middot; {formatRelativeTime(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.isResolved ? 'success' : 'danger'}>{alert.isResolved ? 'Resolved' : 'Active'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Activity</CardTitle>
            <Link to="/activity-logs" className="text-xs font-medium text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {recentActivity.isLoading ? (
              <CardSkeleton className="h-56 w-full" />
            ) : recentActivity.isError ? (
              <ErrorState onRetry={() => recentActivity.refetch()} />
            ) : recentActivity.data?.length === 0 ? (
              <EmptyState title="No activity yet" description="Machine events will show up here." />
            ) : (
              <ul className="space-y-3">
                {recentActivity.data?.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-foreground">
                        <span className="font-medium">{log.machineName}</span> {log.logType}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.description}</p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
