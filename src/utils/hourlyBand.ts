export type DataSelectionMode = 'All' | 'High' | 'Low' | 'Median';

interface TimedValue {
  recordedAt: string;
  value: number;
}

function hourBucketKey(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * Reduces ~720 readings/hour down to ~half, per the selected mode:
 *  - High: the top half by value that hour (the higher readings)
 *  - Low: the bottom half by value that hour (the lower readings)
 *  - Median: the centered half, trimming equally off both the highest and
 *    lowest ends (a "typical values" band, distinct from High/Low)
 *  - All: returns every point unchanged
 * Applied independently per clock-hour so a day's worth of data still spans
 * the whole day rather than collapsing to one hour's readings.
 */
export function filterByHourlyBand<T extends TimedValue>(points: T[], mode: DataSelectionMode): T[] {
  if (mode === 'All') return points;

  const buckets = new Map<string, T[]>();
  for (const p of points) {
    const key = hourBucketKey(p.recordedAt);
    const arr = buckets.get(key);
    if (arr) arr.push(p);
    else buckets.set(key, [p]);
  }

  const result: T[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort((a, b) => a.value - b.value);
    const n = sorted.length;
    const half = Math.round(n / 2);

    let kept: T[];
    if (mode === 'High') kept = sorted.slice(n - half);
    else if (mode === 'Low') kept = sorted.slice(0, half);
    else {
      const trim = Math.floor((n - half) / 2);
      kept = sorted.slice(trim, trim + half);
    }
    result.push(...kept);
  }

  return result.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}
