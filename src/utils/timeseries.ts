import type { SensorParameter, TrendPoint, HistoryRow } from '@/types';

const PARAM_RANGES: Record<SensorParameter, { min: number; max: number; base: number; amp: number; dp: number }> = {
  AQI: { min: 10, max: 180, base: 55, amp: 35, dp: 0 },
  'PM2.5': { min: 2, max: 95, base: 22, amp: 15, dp: 0 },
  PM10: { min: 5, max: 150, base: 38, amp: 22, dp: 0 },
  CO2: { min: 400, max: 1600, base: 620, amp: 300, dp: 0 },
  Temperature: { min: 18, max: 36, base: 27, amp: 4, dp: 1 },
  Humidity: { min: 25, max: 85, base: 55, amp: 15, dp: 0 },
  TVOC: { min: 0.02, max: 1.6, base: 0.25, amp: 0.2, dp: 2 },
  Pressure: { min: 985, max: 1035, base: 1012, amp: 8, dp: 0 },
  Light: { min: 20, max: 900, base: 400, amp: 250, dp: 0 },
  Noise: { min: 28, max: 82, base: 48, amp: 12, dp: 0 },
};

/** Cheap deterministic hash so a given device+parameter always produces the same-looking series. */
function seedFromString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) || 1;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSensorRange(parameter: SensorParameter) {
  return PARAM_RANGES[parameter];
}

/**
 * Generates a deterministic, realistic-looking synthetic time series for a
 * device + parameter between `from` and `to`, with `points` samples.
 * Deterministic per (deviceId, parameter, day) so repeated fetches within the
 * same session look stable rather than jumping around randomly.
 */
export function generateTrendSeries(
  deviceId: string,
  parameter: SensorParameter,
  from: Date,
  to: Date,
  points = 48
): TrendPoint[] {
  const range = PARAM_RANGES[parameter];
  const rng = mulberry32(seedFromString(`${deviceId}:${parameter}:${from.toDateString()}`));
  const stepMs = (to.getTime() - from.getTime()) / Math.max(points - 1, 1);

  const series: TrendPoint[] = [];
  let drift = 0;
  for (let i = 0; i < points; i++) {
    const t = new Date(from.getTime() + stepMs * i);
    const hourFrac = t.getHours() + t.getMinutes() / 60;
    // Daily cycle: mild peak mid-day for most parameters (occupancy-driven).
    const cycle = Math.sin(((hourFrac - 6) / 18) * Math.PI);
    drift += (rng() - 0.5) * range.amp * 0.12;
    drift = Math.max(-range.amp * 0.6, Math.min(range.amp * 0.6, drift));
    const noise = (rng() - 0.5) * range.amp * 0.18;
    let value = range.base + cycle * range.amp * 0.5 + drift + noise;
    value = Math.max(range.min, Math.min(range.max, value));
    series.push({ timestamp: t.toISOString(), value: Number(value.toFixed(range.dp)) });
  }
  return series;
}

export function generateHistoryRows(deviceId: string, from: Date, to: Date, points = 40): HistoryRow[] {
  const params: SensorParameter[] = ['AQI', 'PM2.5', 'PM10', 'CO2', 'Temperature', 'Humidity', 'TVOC', 'Pressure'];
  const seriesByParam = Object.fromEntries(
    params.map((p) => [p, generateTrendSeries(deviceId, p, from, to, points)])
  ) as Record<SensorParameter, TrendPoint[]>;

  const rows: HistoryRow[] = [];
  for (let i = 0; i < points; i++) {
    rows.push({
      id: `${deviceId}-${i}-${seriesByParam.AQI[i].timestamp}`,
      deviceId,
      timestamp: seriesByParam.AQI[i].timestamp,
      aqi: seriesByParam.AQI[i].value,
      pm25: seriesByParam['PM2.5'][i].value,
      pm10: seriesByParam.PM10[i].value,
      co2: seriesByParam.CO2[i].value,
      temperature: seriesByParam.Temperature[i].value,
      humidity: seriesByParam.Humidity[i].value,
      tvoc: seriesByParam.TVOC[i].value,
      pressure: seriesByParam.Pressure[i].value,
    });
  }
  return rows.reverse();
}

export function summarize(series: TrendPoint[], unit: string) {
  if (!series.length) return { average: 0, min: 0, max: 0, current: 0, unit };
  const values = series.map((p) => p.value);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Number((sum / values.length).toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values),
    current: values[values.length - 1],
    unit,
  };
}

export function rangeFromTimeFilter(filter: '1H' | '24H' | '7D' | '30D' | 'CUSTOM', custom?: { from: string; to: string }) {
  const to = custom?.to ? new Date(custom.to) : new Date();
  let from: Date;
  switch (filter) {
    case '1H':
      from = new Date(to.getTime() - 60 * 60 * 1000);
      break;
    case '24H':
      from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7D':
      from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30D':
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'CUSTOM':
      from = custom?.from ? new Date(custom.from) : new Date(to.getTime() - 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  }
  return { from, to };
}
