import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendPoint } from '@/types';
import { formatDateTime, formatTime } from '@/utils/format';

interface TrendChartProps {
  data: TrendPoint[];
  color?: string;
  unit?: string;
  height?: number;
  compact?: boolean;
}

export function TrendChart({ data, color = '#2E7D32', unit = '', height = 320, compact = false }: TrendChartProps) {
  const gradientId = `trend-gradient-${color.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v) => formatTime(v)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
          hide={compact}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={40}
          hide={compact}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: '1px solid hsl(var(--border))',
            background: 'hsl(var(--popover))',
            fontSize: 12,
            color: 'hsl(var(--popover-foreground))',
          }}
          labelFormatter={(v) => formatDateTime(v as string)}
          formatter={(value: number) => [`${value} ${unit}`, 'Value']}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
