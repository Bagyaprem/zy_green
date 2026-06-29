import { supabase } from './supabase.js';

/* ─────────────────────────────────────────────────────────────
   Shared time-bucketed aggregation for the air_quality table.

   The table logs every ~10s (185k+ rows) and PostgREST caps every
   request at 1000 rows, so week/month averages can't be computed by
   pulling raw rows in one query. Strategy:

     1. Fast path — call the bucket_air_quality SQL function (one
        request, any range). Deploy supabase_bucket_function.sql to
        enable it.
     2. Fallback — fetch the range split into per-IST-day chunks in
        parallel (small offsets → no statement timeout) and average
        in the browser. Complete for normal ranges; very long ranges
        are sampled and flagged.
   ───────────────────────────────────────────────────────────── */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const AGG_FIELDS = ['co2', 'pm1', 'pm25', 'pm4', 'pm10', 'temperature', 'humidity'];
const DAY_MS = 24 * 60 * 60 * 1000;

/* Fetch a date range by splitting it into IST-day sub-ranges fetched in
   parallel batches. Each query keeps a small offset so Postgres never times
   out. Returns { rows, sampled }. */
export async function fetchRangeByDays(since, until) {
  const startMs = new Date(since).getTime();
  const endMs   = new Date(until).getTime();
  if (!(endMs > startMs)) return { rows: [], sampled: false };

  const firstDay = Math.floor((startMs + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
  const subRanges = [];
  for (let d = firstDay; d < endMs; d += DAY_MS) {
    const s = Math.max(d, startMs);
    const e = Math.min(d + DAY_MS - 1, endMs);
    if (e >= s) subRanges.push([new Date(s).toISOString(), new Date(e).toISOString()]);
  }

  const sampled = subRanges.length > 45;
  const maxPagesPerDay = sampled ? 2 : 25;
  const cols = 'id, co2, pm1, pm25, pm4, pm10, temperature, humidity, created_at';

  const fetchDayChunk = async ([s, e]) => {
    const out = [];
    for (let p = 0; p < maxPagesPerDay; p++) {
      const { data, error } = await supabase
        .from('air_quality')
        .select(cols)
        .gte('created_at', s)
        .lte('created_at', e)
        .order('created_at', { ascending: true })
        .range(p * 1000, p * 1000 + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  };

  const rows = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < subRanges.length; i += CONCURRENCY) {
    const batch = subRanges.slice(i, i + CONCURRENCY);
    const res = await Promise.all(batch.map(fetchDayChunk));
    res.forEach(r => rows.push(...r));
  }
  return { rows, sampled };
}

/* Bucket raw rows into IST-aligned hour/day averages, shaped exactly like the
   bucket_air_quality RPC output ({ bucket, co2, …, n }). */
export function bucketRowsClient(rows, isHourly) {
  const bucketMs = (isHourly ? 1 : 24) * 60 * 60 * 1000;
  const map = new Map();

  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    if (isNaN(ts)) continue;
    const key = Math.floor((ts + IST_OFFSET_MS) / bucketMs) * bucketMs - IST_OFFSET_MS;
    let b = map.get(key);
    if (!b) { b = { sum: {}, cnt: {}, n: 0 }; map.set(key, b); }
    b.n++;
    for (const f of AGG_FIELDS) {
      const v = Number(row[f]);
      if (!isNaN(v)) { b.sum[f] = (b.sum[f] || 0) + v; b.cnt[f] = (b.cnt[f] || 0) + 1; }
    }
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, b]) => {
      const out = { bucket: new Date(key).toISOString(), n: b.n };
      for (const f of AGG_FIELDS) {
        out[f] = b.cnt[f] ? Math.round((b.sum[f] / b.cnt[f]) * 10) / 10 : null;
      }
      return out;
    });
}

/* High-level: get aggregated buckets for [since, until]. Tries the RPC, then
   falls back to client-side. Returns { buckets, sampled, viaRpc }. */
export async function fetchBuckets(since, until, bucket /* 'hour' | 'day' */) {
  const rpc = await supabase.rpc('bucket_air_quality', {
    p_from: since, p_to: until, p_bucket: bucket,
  });
  if (!rpc.error && rpc.data) {
    return { buckets: rpc.data, sampled: false, viaRpc: true };
  }
  const { rows, sampled } = await fetchRangeByDays(since, until);
  return { buckets: bucketRowsClient(rows, bucket === 'hour'), sampled, viaRpc: false };
}
