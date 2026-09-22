import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axisTickGap, formatAxisTick, formatDateTime, seriesSpanMs } from '@/utils/format';
import type { SensorMeta } from '@/constants/sensorMeta';
import type { SensorReading } from '@/types';

interface TrendChartProps {
  data: SensorReading[];
  series: SensorMeta[];
}

export function TrendChart({ data, series }: TrendChartProps) {
  const chartData = data.map((d) => ({
    timestamp: d.recordedAt,
    ...Object.fromEntries(series.map((s) => [s.field, d[s.field] ?? null])),
  }));

  // Readings arrive oldest-first from sensorService, so the span is just the
  // distance between the ends. The axis labels scale to it: a 24h view keeps
  // clock times, a multi-day view has to name the day.
  const spanMs = seriesSpanMs(data.map((d) => d.recordedAt));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.4} />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v) => formatAxisTick(v, spanMs)}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
          minTickGap={axisTickGap(spanMs)}
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" width={36} />
        <Tooltip
          // Always the full date and time, whatever the axis is showing -
          // hovering a point is the moment you most need to know exactly when.
          labelFormatter={(v) => formatDateTime(v as string)}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.field} type="natural" dataKey={s.field} name={`${s.label} (${s.unit})`} stroke={s.color} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
