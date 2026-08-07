import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { calculateAqi } from '@/constants/aqi';
import type { SensorReading } from '@/types';

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

  /** Readings for a machine within [from, to], oldest first (chart-ready). Capped at 2000 points. */
  async getHistory(machineId: string, from: string, to: string): Promise<SensorReading[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('machine_id', machineId)
      .gte('recorded_at', from)
      .lte('recorded_at', to)
      .order('recorded_at', { ascending: true })
      .limit(2000);
    if (error) throw error;
    return (data as SensorRow[]).map(mapReading);
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
