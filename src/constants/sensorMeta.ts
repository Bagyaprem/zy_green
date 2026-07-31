import type { SensorReading } from '@/types';

export type SensorParameter = 'AQI' | 'PM1.0' | 'PM2.5' | 'PM4.0' | 'PM10' | 'CO2' | 'Temperature' | 'Humidity';

export interface SensorMeta {
  key: SensorParameter;
  field: keyof Pick<SensorReading, 'aqi' | 'pm1_0' | 'pm2_5' | 'pm4_0' | 'pm10' | 'co2' | 'temperature' | 'humidity'>;
  label: string;
  unit: string;
  color: string;
}

export const SENSOR_META: SensorMeta[] = [
  { key: 'AQI', field: 'aqi', label: 'Air Quality Index', unit: 'AQI', color: '#22C55E' },
  { key: 'PM1.0', field: 'pm1_0', label: 'PM1.0', unit: 'µg/m³', color: '#3B82F6' },
  { key: 'PM2.5', field: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', color: '#8B5CF6' },
  { key: 'PM4.0', field: 'pm4_0', label: 'PM4.0', unit: 'µg/m³', color: '#EC4899' },
  { key: 'PM10', field: 'pm10', label: 'PM10', unit: 'µg/m³', color: '#F59E0B' },
  { key: 'CO2', field: 'co2', label: 'CO₂', unit: 'ppm', color: '#0EA5E9' },
  { key: 'Temperature', field: 'temperature', label: 'Temperature', unit: '°C', color: '#EF4444' },
  { key: 'Humidity', field: 'humidity', label: 'Humidity', unit: '%', color: '#06B6D4' },
];
