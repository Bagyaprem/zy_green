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
    const rows: SensorRow[] = [];

    for (let offset = 0; offset < EXPORT_ROW_CEILING; offset += PAGE_SIZE) {
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

      const page = (data ?? []) as SensorRow[];
      rows.push(...page);
      // A short page means the server had nothing more to give.
      if (page.length < PAGE_SIZE) break;
    }

    return rows.map(mapReading);
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
