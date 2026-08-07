/** Standard AQI band classification (US EPA convention) — applied to real aqi readings, not fabricated. */
export interface AqiBand {
  label: string;
  min: number;
  max: number;
  color: string;
}

export const AQI_BANDS: AqiBand[] = [
  { label: 'Good', min: 0, max: 50, color: '#22C55E' },
  { label: 'Moderate', min: 51, max: 100, color: '#EAB308' },
  { label: 'Unhealthy', min: 101, max: 150, color: '#F97316' },
  { label: 'Poor', min: 151, max: 200, color: '#EF4444' },
  { label: 'Very Poor', min: 201, max: 300, color: '#A855F7' },
  { label: 'Hazardous', min: 301, max: Infinity, color: '#7F1D1D' },
];

export function aqiBandFor(aqi: number): AqiBand {
  return AQI_BANDS.find((b) => aqi >= b.min && aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

/**
 * US EPA piecewise-linear AQI breakpoints (µg/m³ -> 0-500 index), applied
 * separately to PM2.5 and PM10 - overall AQI is the worse (higher) of the
 * two, same as EPA's own methodology. sensor_data.aqi has never actually
 * been populated (firmware's pushToSupabase() only sends pm1_0/pm2_5/pm4_0/
 * pm10/co2/temperature/humidity), so this computes a real value from what's
 * actually reported instead of reading a column that's always null.
 */
const PM25_BREAKPOINTS = [
  { concLo: 0.0, concHi: 12.0, aqiLo: 0, aqiHi: 50 },
  { concLo: 12.1, concHi: 35.4, aqiLo: 51, aqiHi: 100 },
  { concLo: 35.5, concHi: 55.4, aqiLo: 101, aqiHi: 150 },
  { concLo: 55.5, concHi: 150.4, aqiLo: 151, aqiHi: 200 },
  { concLo: 150.5, concHi: 250.4, aqiLo: 201, aqiHi: 300 },
  { concLo: 250.5, concHi: 350.4, aqiLo: 301, aqiHi: 400 },
  { concLo: 350.5, concHi: 500.4, aqiLo: 401, aqiHi: 500 },
];

const PM10_BREAKPOINTS = [
  { concLo: 0, concHi: 54, aqiLo: 0, aqiHi: 50 },
  { concLo: 55, concHi: 154, aqiLo: 51, aqiHi: 100 },
  { concLo: 155, concHi: 254, aqiLo: 101, aqiHi: 150 },
  { concLo: 255, concHi: 354, aqiLo: 151, aqiHi: 200 },
  { concLo: 355, concHi: 424, aqiLo: 201, aqiHi: 300 },
  { concLo: 425, concHi: 504, aqiLo: 301, aqiHi: 400 },
  { concLo: 505, concHi: 604, aqiLo: 401, aqiHi: 500 },
];

function subIndex(conc: number, breakpoints: typeof PM25_BREAKPOINTS): number {
  const c = Math.max(0, conc);
  const bp = breakpoints.find((b) => c >= b.concLo && c <= b.concHi) ?? breakpoints[breakpoints.length - 1];
  return Math.round(((bp.aqiHi - bp.aqiLo) / (bp.concHi - bp.concLo)) * (c - bp.concLo) + bp.aqiLo);
}

/** Overall AQI from PM2.5/PM10 readings; null if neither is available. */
export function calculateAqi(pm25: number | null, pm10: number | null): number | null {
  if (pm25 === null && pm10 === null) return null;
  const candidates: number[] = [];
  if (pm25 !== null) candidates.push(subIndex(pm25, PM25_BREAKPOINTS));
  if (pm10 !== null) candidates.push(subIndex(pm10, PM10_BREAKPOINTS));
  return Math.max(...candidates);
}

export type ParamStatus = 'Good' | 'Normal' | 'Warning' | 'Critical';

/** Generic threshold-based status for the non-AQI parameters shown in the Air Quality Summary table. Thresholds are the same widely-used defaults the app used before a settings table existed. */
const THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  pm2_5: { warning: 35, critical: 55 },
  pm10: { warning: 100, critical: 150 },
  co2: { warning: 1000, critical: 1500 },
  temperature: { warning: 30, critical: 35 },
  humidity: { warning: 70, critical: 85 },
};

export function statusFor(field: string, value: number): ParamStatus {
  const t = THRESHOLDS[field];
  if (!t) return 'Normal';
  if (value >= t.critical) return 'Critical';
  if (value >= t.warning) return 'Warning';
  return 'Good';
}
