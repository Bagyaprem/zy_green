import { create } from 'zustand';
import type { AuthenticatedUser } from '@/types';
import { authService } from '@/services/authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  login: (user: AuthenticatedUser) => void;
  logout: () => void;
  setUser: (user: AuthenticatedUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  hydrate: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user, status: user ? 'authenticated' : 'unauthenticated' });
    } catch {
      // Supabase not configured / unreachable — treat as unauthenticated rather than crash.
      set({ user: null, status: 'unauthenticated' });
    }
  },
  login: (user) => set({ user, status: 'authenticated' }),
  logout: () => set({ user: null, status: 'unauthenticated' }),
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
}));
