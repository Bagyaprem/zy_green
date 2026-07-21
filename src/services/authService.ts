import type { AuthenticatedUser, LoginInput } from '@/types';
import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

const avatarColors = ['#2E7D32', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#EC4899'];

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
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw error;
    const user = await mapSessionToUser(data.session);
    if (!user) throw new Error('Login succeeded but no user session was returned.');
    return user;
  },

  async logout(): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** Resolves the current session (if any) into an AuthenticatedUser. Async because a real Supabase session lookup is async. */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return mapSessionToUser(data.session);
  },

  /** Subscribes to Supabase auth state changes; returns an unsubscribe function. */
  onAuthStateChange(callback: (user: AuthenticatedUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void mapSessionToUser(session).then(callback);
    });
    return () => data.subscription.unsubscribe();
  },
};
