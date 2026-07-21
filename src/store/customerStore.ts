import { create } from 'zustand';

interface CustomerFilterState {
  search: string;
  setSearch: (v: string) => void;
}

export const useCustomerStore = create<CustomerFilterState>((set) => ({
  search: '',
  setSearch: (search) => set({ search }),
}));
