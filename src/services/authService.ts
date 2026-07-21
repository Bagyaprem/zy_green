import type { AuthenticatedUser, LoginInput } from '@/types';
import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { environment } from '@/config/environment';
import type { Session } from '@supabase/supabase-js';

const avatarColors = ['#2E7D32', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#EC4899'];

/**
 * Dev-only login bypass: while VITE_ADMIN_SUPABASE_* is unconfigured, real
 * Supabase auth can't work at all, so there'd be no way to reach the UI.
 * These fixed credentials let you in locally; remove this block once a real
 * Supabase project is wired up (isSupabaseConfigured becomes true and this
 * path is skipped automatically).
 */
export const DEV_LOGIN_EMAIL = 'admin@zygreen.dev';
export const DEV_LOGIN_PASSWORD = 'admin1234';
const DEV_SESSION_KEY = 'zygreen_dev_session';

const devUser: AuthenticatedUser = {
  id: 'dev-user',
  name: 'Dev Admin',
  email: DEV_LOGIN_EMAIL,
  role: 'Admin',
  avatarColor: avatarColors[0],
};

async function mapSessionToUser(session: Session | null): Promise<AuthenticatedUser | null> {
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  return {
    id: session.user.id,
    name: profile?.name ?? session.user.email?.split('@')[0] ?? 'User',
    email: session.user.email ?? '',
    role: profile?.role ?? 'Viewer',
    avatarColor: profile?.avatar_color ?? avatarColors[0],
  };
}

export const authService = {
  async login(input: LoginInput): Promise<AuthenticatedUser> {
    if (!environment.isSupabaseConfigured) {
      if (input.email.trim().toLowerCase() === DEV_LOGIN_EMAIL && input.password === DEV_LOGIN_PASSWORD) {
        sessionStorage.setItem(DEV_SESSION_KEY, '1');
        return devUser;
      }
      throw new Error(`Supabase isn't configured yet — use the dev credentials shown below the form (${DEV_LOGIN_EMAIL} / ${DEV_LOGIN_PASSWORD}).`);
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw error;
    const user = await mapSessionToUser(data.session);
    if (!user) throw new Error('Login succeeded but no user session was returned.');
    return user;
  },

  async logout(): Promise<void> {
    if (!environment.isSupabaseConfigured) {
      sessionStorage.removeItem(DEV_SESSION_KEY);
      return;
    }
    assertSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** Resolves the current session (if any) into an AuthenticatedUser. Async because a real Supabase session lookup is async. */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    if (!environment.isSupabaseConfigured) {
      return sessionStorage.getItem(DEV_SESSION_KEY) ? devUser : null;
    }
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return mapSessionToUser(data.session);
  },

  /** Subscribes to Supabase auth state changes; returns an unsubscribe function. No-op in dev-login mode since there's no real session to watch. */
  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void {
    if (!environment.isSupabaseConfigured) {
      return () => {};
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void mapSessionToUser(session).then(callback);
    });
    return () => data.subscription.unsubscribe();
  },
};
