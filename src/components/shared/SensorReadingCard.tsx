import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ParamStatus } from '@/constants/aqi';
import { formatNumber } from '@/utils/format';

interface SensorReadingCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: LucideIcon;
  status: ParamStatus;
  decimals?: number;
}

const STATUS_DOT: Record<ParamStatus, string> = {
  Good: 'bg-success',
  Normal: 'bg-success',
  Warning: 'bg-warning',
  Critical: 'bg-danger',
};

const STATUS_TEXT: Record<ParamStatus, string> = {
  Good: 'text-success',
  Normal: 'text-success',
  Warning: 'text-warning',
  Critical: 'text-danger',
};

export function SensorReadingCard({ label, value, unit, icon: Icon, status, decimals = 0 }: SensorReadingCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        {value === null ? '-' : formatNumber(value, decimals)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
        <span className={cn('text-xs font-medium', STATUS_TEXT[status])}>{status}</span>
      </div>
    </Card>
  );
}
