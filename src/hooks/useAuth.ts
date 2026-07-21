import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, status, login, logout } = useAuthStore();
  return { user, status, isAuthenticated: status === 'authenticated', login, logout };
}
