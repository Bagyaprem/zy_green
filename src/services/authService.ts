import type { AuthenticatedUser, LoginInput } from '@/types';
import { wait } from '@/utils/latency';
import { appConfig } from '@/config/config';

const STORAGE_KEY = 'zygreen_admin_session';

const DEMO_USER: AuthenticatedUser = {
  id: 'USR-001',
  name: 'Aarav Menon',
  email: 'admin@zygreen.io',
  role: 'Super Admin',
  avatarColor: '#2E7D32',
};

export const authService = {
  async login(input: LoginInput): Promise<AuthenticatedUser> {
    await wait(appConfig.mockLatency.slow);
    if (!input.email || !input.password || input.password.length < 4) {
      throw new Error('Invalid email or password');
    }
    const user: AuthenticatedUser = { ...DEMO_USER, email: input.email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    await wait(appConfig.mockLatency.fast);
    localStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser(): AuthenticatedUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthenticatedUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },
};
