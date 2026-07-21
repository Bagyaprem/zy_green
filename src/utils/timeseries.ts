import type { TrendPoint } from '@/types';

/** Pure math over real fetched data — no synthetic/fabricated values live here. */
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
