import type { AuthenticatedUser, LoginInput } from '@/types';
import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { environment } from '@/config/environment';
import type { Session } from '@supabase/supabase-js';

const avatarColors = ['#2E7D32', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#EC4899'];

/**
 * Dev-only login bypass: while VITE_ADMIN_SUPABASE_* is unconfigured in a
 * LOCAL dev build, real Supabase auth can't work at all, so there'd be no
 * way to reach the UI. Gated on environment.isDevLoginEnabled, which
 * requires import.meta.env.DEV — see the comment there for why keying this
 * off "Supabase unconfigured" alone was an exploitable hole in any deployed
 * build that was missing its env vars.
 */
export const DEV_LOGIN_EMAIL = 'admin@zygreen.dev';
export const DEV_LOGIN_PASSWORD = 'admin1234';
const DEV_SESSION_KEY = 'zygreen_dev_session';

const devUser: AuthenticatedUser = {
  id: 'dev-user',
  name: 'Dev Admin',
  email: DEV_LOGIN_EMAIL,
  avatarColor: avatarColors[0],
  customerId: null,
};

/**
 * Maps a Supabase Auth session to the app's user shape. If the session's
 * email matches a row in `customers`, this is that customer (scoped to
 * their own data by RLS). Otherwise it must match the `admin_users`
 * allowlist to be treated as an admin — an authenticated session that
 * matches neither (e.g. a self-signed-up account) is not a valid app user
 * even though Supabase Auth accepted the login, so it's signed out rather
 * than shown a shell with no data.
 */
async function sessionToUser(session: Session | null): Promise<AuthenticatedUser | null> {
  if (!session?.user) return null;

  const email = session.user.email ?? '';
  const { data: customer, error: customerError } = await supabase.from('customers').select('id, customer_name').eq('email', email).maybeSingle();
  if (customerError) throw new Error(`Couldn't verify your account (${customerError.message}). Please try again.`);
  if (customer) {
    return {
      id: session.user.id,
      name: customer.customer_name,
      email,
      avatarColor: avatarColors[0],
      customerId: customer.id,
    };
  }

  const { data: admin, error: adminError } = await supabase.from('admin_users').select('email').eq('email', email).maybeSingle();
  if (adminError) throw new Error(`Couldn't verify your account (${adminError.message}). Please try again.`);
  if (!admin) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    id: session.user.id,
    name: email.split('@')[0] || 'Admin',
    email,
    avatarColor: avatarColors[0],
    customerId: null,
  };
}

export const authService = {
  async login(input: LoginInput): Promise<AuthenticatedUser> {
    if (environment.isDevLoginEnabled) {
      if (input.email.trim().toLowerCase() === DEV_LOGIN_EMAIL && input.password === DEV_LOGIN_PASSWORD) {
        sessionStorage.setItem(DEV_SESSION_KEY, '1');
        return devUser;
      }
      throw new Error(`Supabase isn't configured yet — use the dev credentials shown below the form (${DEV_LOGIN_EMAIL} / ${DEV_LOGIN_PASSWORD}).`);
    }
    if (!environment.isSupabaseConfigured) {
      throw new Error(
        'This deployment is missing its Supabase configuration (VITE_ADMIN_SUPABASE_URL / VITE_ADMIN_SUPABASE_ANON_KEY). Set them in the hosting provider and redeploy.'
      );
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw error;
    const user = await sessionToUser(data.session);
    if (!user) throw new Error('This account is not registered as a customer or admin for ZYGREEN.');
    return user;
  },

  async logout(): Promise<void> {
    if (environment.isDevLoginEnabled) {
      sessionStorage.removeItem(DEV_SESSION_KEY);
      return;
    }
    assertSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** Resolves the current session (if any) into an AuthenticatedUser. */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    if (environment.isDevLoginEnabled) {
      return sessionStorage.getItem(DEV_SESSION_KEY) ? devUser : null;
    }
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return sessionToUser(data.session);
  },

  /** Subscribes to Supabase auth state changes; returns an unsubscribe function. No-op in dev-login mode since there's no real session to watch. */
  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void {
    if (!environment.isSupabaseConfigured) {
      return () => {};   // nothing to subscribe to: dev-login mode, or a misconfigured deploy
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void sessionToUser(session).then(callback);
    });
    return () => data.subscription.unsubscribe();
  },
};
