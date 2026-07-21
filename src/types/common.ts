export type TimeRange = '1H' | '24H' | '7D' | '30D' | 'CUSTOM';

export type SensorParameter =
  | 'AQI'
  | 'PM2.5'
  | 'PM10'
  | 'CO2'
  | 'Temperature'
  | 'Humidity'
  | 'TVOC'
  | 'Pressure'
  | 'Light'
  | 'Noise';

export interface SensorMeta {
  key: SensorParameter;
  label: string;
  unit: string;
  color: string;
  icon: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DateRangeValue {
  from: string;
  to: string;
}
