import type { SensorMeta } from '@/types';

/**
 * Static UI display configuration (label/unit/color/icon) for each sensor
 * parameter. This is presentation config owned by the frontend, not
 * fabricated business data — the actual readings always come from Supabase.
 */
export const SENSOR_META: SensorMeta[] = [
  { key: 'AQI', label: 'AQI', unit: '', color: '#22C55E', icon: 'Activity' },
  { key: 'PM2.5', label: 'PM2.5', unit: 'ug/m3', color: '#3B82F6', icon: 'Wind' },
  { key: 'PM10', label: 'PM10', unit: 'ug/m3', color: '#8B5CF6', icon: 'CloudFog' },
  { key: 'CO2', label: 'CO2', unit: 'ppm', color: '#F59E0B', icon: 'Cloud' },
  { key: 'Temperature', label: 'Temperature', unit: 'C', color: '#EF4444', icon: 'Thermometer' },
  { key: 'Humidity', label: 'Humidity', unit: '%', color: '#06B6D4', icon: 'Droplets' },
  { key: 'TVOC', label: 'TVOC', unit: 'ppm', color: '#EC4899', icon: 'FlaskConical' },
  { key: 'Pressure', label: 'Pressure', unit: 'hPa', color: '#6366F1', icon: 'Gauge' },
  { key: 'Light', label: 'Light', unit: 'lux', color: '#F97316', icon: 'Sun' },
  { key: 'Noise', label: 'Noise', unit: 'dB', color: '#84CC16', icon: 'Volume2' },
];

export const SENSOR_READING_COLUMN: Record<string, string> = {
  AQI: 'aqi',
  'PM2.5': 'pm25',
  PM10: 'pm10',
  CO2: 'co2',
  Temperature: 'temperature',
  Humidity: 'humidity',
  TVOC: 'tvoc',
  Pressure: 'pressure',
  Light: 'light',
  Noise: 'noise',
};
