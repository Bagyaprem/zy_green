/**
 * Evenly thins a series to at most `max` points, always keeping the first and
 * last so the result still spans the full range it was drawn from.
 *
 * This exists because "how much data do we fetch" and "how much can we draw"
 * are different questions, and conflating them was a real bug: charts used to
 * be fed a query capped at 2000 rows, so a 24-hour view (~2,880 readings at
 * the firmware's 30s cadence) silently plotted only its first ~17 hours and
 * looked, convincingly, like the device had stopped reporting. Fetch the whole
 * range, then thin it here for the renderer.
 *
 * Sampling rather than averaging, so every plotted point is a value the
 * device actually recorded.
 */
export function downsample<T>(points: T[], max: number): T[] {
  if (max < 2 || points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

/** Points per on-screen chart. Well past the point where more pixels of line add information. */
export const CHART_DISPLAY_POINTS = 1500;
