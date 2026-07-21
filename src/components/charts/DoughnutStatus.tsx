import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DeviceStatusBreakdown } from '@/types';

interface DoughnutStatusProps {
  data: DeviceStatusBreakdown[];
  total: number;
}

export function DoughnutStatus({ data, total }: DoughnutStatusProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={62} outerRadius={90} paddingAngle={3} strokeWidth={0}>
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--popover))',
              fontSize: 12,
              color: 'hsl(var(--popover-foreground))',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-foreground">{total}</span>
        <span className="text-[11px] text-muted-foreground">Total</span>
      </div>
    </div>
  );
}
