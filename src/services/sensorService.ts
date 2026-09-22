import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { calculateAqi } from '@/constants/aqi';
import type { SensorReading } from '@/types';

/**
 * Rows per request when paging a full export. PostgREST caps a single
 * response at its max-rows setting (1000 by default), so asking for more in
 * one go just gets silently trimmed — page at the ceiling instead.
 */
const PAGE_SIZE = 1000;

/** Hard stop for a paged export (~35 days of 30s readings), so a bad date range can't page forever. */
const EXPORT_ROW_CEILING = 100_000;

/** Upper bound on points handed to a chart — past this, recharts costs a lot and shows nothing extra. */
const CHART_POINT_CAP = 2000;

/**
 * Pages fetched at once in getAllHistory.
 *
 * Six matches what a browser will open to one host anyway, and is polite
 * enough not to look like a burst to PostgREST. The pages are independent
 * reads, so this is purely a latency win: a month's 90 pages go from 90
 * round-trips end to end down to 15 waves.
 */
const PAGE_CONCURRENCY = 6;

/** Runs `task` over every item, keeping at most `limit` in flight, and returns results in input order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface SensorRow {
  id: number;
  machine_id: string;
  recorded_at: string;
  co2: number | null;
  temperature: number | null;
  humidity: number | null;
  pm1_0: number | null;
  pm2_5: number | null;
  pm4_0: number | null;
  pm10: number | null;
  aqi: number | null;
}

function mapReading(row: SensorRow): SensorReading {
  return {
    id: String(row.id),
    machineId: row.machine_id,
    recordedAt: row.recorded_at,
    co2: row.co2,
    temperature: row.temperature,
    humidity: row.humidity,
    pm1_0: row.pm1_0,
    pm2_5: row.pm2_5,
    pm4_0: row.pm4_0,
    pm10: row.pm10,
    // sensor_data.aqi is never populated by the firmware - compute it from
    // the PM readings that actually are, rather than always returning null.
    aqi: row.aqi ?? calculateAqi(row.pm2_5, row.pm10),
  };
}

/** Fetches one page of readings in the canonical (recorded_at, id) order. */
async function fetchPage(machineId: string, from: string, to: string, offset: number): Promise<SensorRow[]> {
  const { data, error } = await supabase
    .from('sensor_data')
    .select('*')
    .eq('machine_id', machineId)
    .gte('recorded_at', from)
    .lte('recorded_at', to)
    .order('recorded_at', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []) as SensorRow[];
}

/**
 * The original one-page-at-a-time walk, kept as the fallback for when the row
 * count isn't available up front. Correct but latency-bound - it can only
 * learn it has reached the end by asking.
 */
async function pageSequentially(machineId: string, from: string, to: string): Promise<SensorReading[]> {
  const rows: SensorRow[] = [];

  for (let offset = 0; offset < EXPORT_ROW_CEILING; offset += PAGE_SIZE) {
    const page = await fetchPage(machineId, from, to, offset);
    rows.push(...page);
    // A short page means the server had nothing more to give.
    if (page.length < PAGE_SIZE) break;
  }

  return rows.map(mapReading);
}

export const sensorService = {
  async getLatestReading(machineId: string): Promise<SensorReading | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('machine_id', machineId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReading(data as SensorRow) : undefined;
  },

  /**
   * Readings for a machine within [from, to], oldest first (chart-ready),
   * capped at CHART_POINT_CAP points.
   *
   * The cap is deliberate HERE and only here: this feeds live trend charts
   * and the analytics page, where handing recharts tens of thousands of
   * points would lock up the browser for no visual gain. Anything that must
   * be complete — every report and export — has to use getAllHistory()
   * instead, or it will silently ship a truncated file.
   */
  async getHistory(machineId: string, from: string, to: string): Promise<SensorReading[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('machine_id', machineId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: true })
      .limit(CHART_POINT_CAP);
    if (error) throw error;
    return (data as SensorRow[]).map(mapReading);
  },

  /**
   * Every reading in [from, to], oldest first — paged, so the result is not
   * silently cut off at PostgREST's per-request row ceiling.
   *
   * A single `.limit(n)` cannot do this: PostgREST enforces its own max-rows
   * setting (1000 by default, see supabase/config.toml) and returns that many
   * without any error or indication that more exist. Firmware reports roughly
   * every 30s, so a one-month report covers ~86,000 rows — under the old
   * single capped query, a month-long PDF/CSV/Excel confidently printed the
   * requested date range in its header while containing only the first few
   * hours of it.
   */
  async getAllHistory(machineId: string, from: string, to: string): Promise<SensorReading[]> {
    assertSupabaseConfigured();

    // One cheap head-only count up front, so the pages can be fetched together
    // rather than discovering where the data ends one round-trip at a time.
    // Walking pages sequentially made the wall-clock cost of a range purely a
    // function of its length: a week is 21 pages (~4s of nothing but latency),
    // a month 90 (~18s), with every request idle waiting on the previous one.
    const { count, error: countError } = await supabase
      .from('sensor_data')
      .select('id', { count: 'exact', head: true })
      .eq('machine_id', machineId)
      .gte('recorded_at', from)
      .lte('recorded_at', to);
    if (countError) throw countError;

    // No count header came back (it is the one part of this that depends on
    // PostgREST populating Content-Range). Fall back to walking pages rather
    // than treating an unknown total as "no data" and silently drawing an
    // empty chart over a range that has readings in it.
    if (count == null) return pageSequentially(machineId, from, to);

    const total = Math.min(count, EXPORT_ROW_CEILING);
    if (total === 0) return [];

    const offsets: number[] = [];
    for (let offset = 0; offset < total; offset += PAGE_SIZE) offsets.push(offset);

    // (recorded_at, id) is a total order, so every page is independent and the
    // results reassemble deterministically regardless of completion order.
    const pages = await mapWithConcurrency(offsets, PAGE_CONCURRENCY, (offset) => fetchPage(machineId, from, to, offset));

    return pages.flat().map(mapReading);
  },

  /** Same as getHistory but newest first, for tabular display. */
  async getRecentReadings(machineId: string, limit = 25): Promise<SensorReading[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('machine_id', machineId)
      .order('recorded_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as SensorRow[]).map(mapReading);
  },
};
