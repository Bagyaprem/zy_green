import { create } from 'zustand';

interface UserFilterState {
  search: string;
  role: string;
  setSearch: (v: string) => void;
  setRole: (v: string) => void;
}

export const useUserStore = create<UserFilterState>((set) => ({
  search: '',
  role: 'all',
  setSearch: (search) => set({ search }),
  setRole: (role) => set({ role }),
}));
