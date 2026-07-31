export type TimeRangeKey = '1H' | '6H' | '12H' | '24H';

const HOURS: Record<TimeRangeKey, number> = { '1H': 1, '6H': 6, '12H': 12, '24H': 24 };

/** Returns the [from, to] ISO bounds for a relative time-range selector like the Live Trend chart's 1H/6H/12H/24H toggle. */
export function rangeFromKey(key: TimeRangeKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - HOURS[key] * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}
