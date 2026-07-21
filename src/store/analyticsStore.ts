import { create } from 'zustand';
import type { SensorParameter, TimeRange } from '@/types';

interface AnalyticsFilterState {
  deviceId: string;
  parameter: SensorParameter;
  timeRange: TimeRange;
  customFrom: string;
  customTo: string;
  setDeviceId: (v: string) => void;
  setParameter: (v: SensorParameter) => void;
  setTimeRange: (v: TimeRange) => void;
  setCustomRange: (from: string, to: string) => void;
}

export const useAnalyticsStore = create<AnalyticsFilterState>((set) => ({
  deviceId: '',
  parameter: 'AQI',
  timeRange: '24H',
  customFrom: '',
  customTo: '',
  setDeviceId: (deviceId) => set({ deviceId }),
  setParameter: (parameter) => set({ parameter }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setCustomRange: (customFrom, customTo) => set({ customFrom, customTo }),
}));
