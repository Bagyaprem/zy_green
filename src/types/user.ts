export type UserRole = 'Super Admin' | 'Admin' | 'Operator' | 'Viewer';
export type UserStatus = 'Active' | 'Inactive';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  customerId: string | null;
  customerName: string | null;
  lastLogin: string | null;
  createdAt: string;
  avatarColor: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  customerId: string | null;
}

export interface RolePermission {
  role: UserRole;
  description: string;
  permissions: {
    key: string;
    label: string;
    allowed: boolean;
  }[];
}
