import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { AQI_BANDS } from '@/constants/aqi';
import { formatNumber } from '@/utils/format';

interface AqiDonutProps {
  average: number;
  bandCounts: Record<string, number>;
  total: number;
}

export function AqiDonut({ average, bandCounts, total }: AqiDonutProps) {
  const data = AQI_BANDS.map((b) => ({ name: b.label, value: bandCounts[b.label] ?? 0, color: b.color }));

  return (
    <div className="space-y-3">
      <div className="relative mx-auto h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={data.some((d) => d.value > 0) ? 2 : 0} startAngle={90} endAngle={-270}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{formatNumber(average)}</span>
          <span className="text-[10px] text-muted-foreground">AQI Average</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {AQI_BANDS.map((b) => (
          <div key={b.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
            <span className="text-muted-foreground">
              {b.label} ({b.min}-{b.max === Infinity ? '300+' : b.max})
            </span>
            <span className="ml-auto font-medium text-foreground">{total > 0 ? formatNumber(((bandCounts[b.label] ?? 0) / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
