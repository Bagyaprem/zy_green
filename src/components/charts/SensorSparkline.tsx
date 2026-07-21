import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { TrendPoint } from '@/types';

interface SensorSparklineProps {
  data: TrendPoint[];
  color?: string;
}

export function SensorSparkline({ data, color = '#2E7D32' }: SensorSparklineProps) {
  const gradientId = `spark-gradient-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.75} fill={`url(#${gradientId})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
