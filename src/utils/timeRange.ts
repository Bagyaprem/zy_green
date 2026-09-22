export type TimeRangeKey = '1H' | '6H' | '12H' | '24H';

const HOURS: Record<TimeRangeKey, number> = { '1H': 1, '6H': 6, '12H': 12, '24H': 24 };

/** Returns the [from, to] ISO bounds for a relative time-range selector like the Live Trend chart's 1H/6H/12H/24H toggle. */
export function rangeFromKey(key: TimeRangeKey): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - HOURS[key] * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * [from, to] ISO bounds for a pair of <input type="date"> values (YYYY-MM-DD),
 * covering the whole of both days in the viewer's own timezone.
 *
 * Both ends have to be built the same way. `new Date('2026-09-15')` is parsed
 * as UTC midnight per the ECMAScript date-only form, while
 * `new Date('2026-09-15T23:59:59')` is parsed as LOCAL time - so pairing the
 * two shifted the start of the window forward by the UTC offset. In IST
 * (+05:30) that silently dropped the first 5.5 hours of the From day from
 * every analytics chart and CSV export, with the UI still showing the date the
 * user had picked.
 */
export function dayRangeToIso(fromDay: string, toDay: string): { from: string; to: string } {
  return {
    from: new Date(`${fromDay}T00:00:00.000`).toISOString(),
    to: new Date(`${toDay}T23:59:59.999`).toISOString(),
  };
}
