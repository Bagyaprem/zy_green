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
