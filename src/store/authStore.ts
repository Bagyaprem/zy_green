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

/**
 * Guards against a slow hydrate() clobbering newer auth state.
 *
 * AuthBootstrap kicks off hydrate() (two awaited round-trips: getSession(),
 * then a customers/admin_users lookup) and separately subscribes to
 * onAuthStateChange, which writes to this store independently. Nothing
 * sequenced the two. If a sign-out landed while hydrate() was still in
 * flight, hydrate()'s stale result would resolve afterwards and flip the
 * store back to 'authenticated' with the signed-out user's data.
 *
 * Every synchronous state-setter bumps this counter, so an in-flight
 * hydrate() can tell it has been superseded and drop its result. Auth events
 * are by definition newer information than a hydrate that started earlier,
 * so last-writer-wins is exactly the wrong rule here.
 */
let stateGeneration = 0;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  hydrate: async () => {
    const generation = stateGeneration;
    try {
      const user = await authService.getCurrentUser();
      if (generation !== stateGeneration) return; // superseded by a newer auth event
      set({ user, status: user ? 'authenticated' : 'unauthenticated' });
    } catch {
      if (generation !== stateGeneration) return;
      // Supabase not configured / unreachable — treat as unauthenticated rather than crash.
      set({ user: null, status: 'unauthenticated' });
    }
  },
  login: (user) => {
    stateGeneration++;
    set({ user, status: 'authenticated' });
  },
  logout: () => {
    stateGeneration++;
    set({ user: null, status: 'unauthenticated' });
  },
  setUser: (user) => {
    stateGeneration++;
    set({ user, status: user ? 'authenticated' : 'unauthenticated' });
  },
}));
