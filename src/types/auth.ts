import type { UserRole } from './user';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
