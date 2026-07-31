export interface SensorReading {
  id: string;
  machineId: string;
  recordedAt: string;
  co2: number | null;
  temperature: number | null;
  humidity: number | null;
  pm1_0: number | null;
  pm2_5: number | null;
  pm4_0: number | null;
  pm10: number | null;
  aqi: number | null;
}
