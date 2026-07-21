import { create } from 'zustand';

interface DeviceFilterState {
  search: string;
  status: string;
  customerId: string;
  location: string;
  setSearch: (v: string) => void;
  setStatus: (v: string) => void;
  setCustomerId: (v: string) => void;
  setLocation: (v: string) => void;
  reset: () => void;
}

export const useDeviceStore = create<DeviceFilterState>((set) => ({
  search: '',
  status: 'all',
  customerId: 'all',
  location: 'all',
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setCustomerId: (customerId) => set({ customerId }),
  setLocation: (location) => set({ location }),
  reset: () => set({ search: '', status: 'all', customerId: 'all', location: 'all' }),
}));
