import { useEffect, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

/**
 * Resolves the current Supabase session once on mount and keeps the auth
 * store in sync with future sign-in/sign-out events. With placeholder
 * Supabase credentials, hydrate() fails gracefully and simply lands on
 * 'unauthenticated' (routing to /login) instead of crashing the app.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    void hydrate();
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = authService.onAuthStateChange((user) => setUser(user));
    } catch {
      // Supabase not configured — no realtime auth events to subscribe to.
    }
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
