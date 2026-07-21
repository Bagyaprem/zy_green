import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AlertSeverity, AlertStatus, DeviceStatus } from '@/types';
import { alertSeverityColor, alertStatusColor, deviceStatusColor, deviceStatusDot } from '@/constants/statusColors';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <Badge variant={deviceStatusColor[status] as BadgeVariant}>
      <span className={cn('h-1.5 w-1.5 rounded-full', deviceStatusDot[status], status === 'Online' && 'animate-pulse-dot')} />
      {status}
    </Badge>
  );
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  return <Badge variant={alertSeverityColor[severity] as BadgeVariant}>{severity}</Badge>;
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  return <Badge variant={alertStatusColor[status] as BadgeVariant}>{status}</Badge>;
}
