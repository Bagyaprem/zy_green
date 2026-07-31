import { create } from 'zustand';

interface MachineFilterState {
  search: string;
  status: string;
  customerId: string;
  setSearch: (v: string) => void;
  setStatus: (v: string) => void;
  setCustomerId: (v: string) => void;
  reset: () => void;
}

export const useMachineStore = create<MachineFilterState>((set) => ({
  search: '',
  status: 'all',
  customerId: 'all',
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setCustomerId: (customerId) => set({ customerId }),
  reset: () => set({ search: '', status: 'all', customerId: 'all' }),
}));
