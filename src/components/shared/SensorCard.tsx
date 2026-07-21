import type { LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SensorSparkline } from '@/components/charts/SensorSparkline';
import type { TrendPoint } from '@/types';

interface SensorCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: string;
  color: string;
  status?: 'good' | 'warning' | 'danger';
  series?: TrendPoint[];
}

const statusLabel: Record<NonNullable<SensorCardProps['status']>, string> = {
  good: 'Excellent',
  warning: 'Elevated',
  danger: 'Critical',
};

const statusClass: Record<NonNullable<SensorCardProps['status']>, string> = {
  good: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function SensorCard({ label, value, unit, icon, color, status = 'good', series }: SensorCardProps) {
  const Icon = (Icons[icon as keyof typeof Icons] as LucideIcon) ?? Icons.Activity;

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1A`, color }}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <span className={cn('text-[11px] font-medium', statusClass[status])}>{statusLabel[status]}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
          {unit && <span className="ml-1 text-xs text-muted-foreground">{unit}</span>}
        </div>
        {series && series.length > 0 && (
          <div className="h-10 w-24">
            <SensorSparkline data={series} color={color} />
          </div>
        )}
      </div>
    </Card>
  );
}
