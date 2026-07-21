import { create } from 'zustand';
import type { AuthenticatedUser } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  hydrate: () => void;
  login: (user: AuthenticatedUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  hydrate: () => {
    const user = authService.getCurrentUser();
    set({ user, isAuthenticated: !!user });
  },
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
