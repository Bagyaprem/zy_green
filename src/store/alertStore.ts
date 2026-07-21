import { create } from 'zustand';

interface AlertFilterState {
  severity: string;
  status: string;
  from: string;
  to: string;
  setSeverity: (v: string) => void;
  setStatus: (v: string) => void;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  reset: () => void;
}

export const useAlertStore = create<AlertFilterState>((set) => ({
  severity: 'all',
  status: 'all',
  from: '',
  to: '',
  setSeverity: (severity) => set({ severity }),
  setStatus: (status) => set({ status }),
  setFrom: (from) => set({ from }),
  setTo: (to) => set({ to }),
  reset: () => set({ severity: 'all', status: 'all', from: '', to: '' }),
}));
