import usersData from '@/mock/users.json';
import permissionsData from '@/mock/permissions.json';
import type { AppUser, CreateUserInput, RolePermission } from '@/types';
import { wait } from '@/utils/latency';
import { generateId } from '@/utils/id';
import { appConfig } from '@/config/config';

let users: AppUser[] = JSON.parse(JSON.stringify(usersData)) as AppUser[];
const rolePermissions: RolePermission[] = permissionsData as RolePermission[];
const avatarColors = ['#2E7D32', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#EC4899'];

export const userService = {
  async getUsers(search?: string): Promise<AppUser[]> {
    await wait();
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getUser(id: string): Promise<AppUser | undefined> {
    await wait(appConfig.mockLatency.fast);
    return users.find((u) => u.id === id);
  },

  async createUser(input: CreateUserInput): Promise<AppUser> {
    await wait(appConfig.mockLatency.slow);
    const newUser: AppUser = {
      id: generateId('USR'),
      name: input.name,
      email: input.email,
      role: input.role,
      status: 'Active',
      customerId: input.customerId,
      customerName: null,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
    };
    users = [newUser, ...users];
    return newUser;
  },

  async updateUser(id: string, input: Partial<CreateUserInput> & { status?: AppUser['status'] }): Promise<AppUser> {
    await wait();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], ...input };
    return users[idx];
  },

  async deleteUser(id: string): Promise<void> {
    await wait();
    users = users.filter((u) => u.id !== id);
  },

  async toggleStatus(id: string): Promise<AppUser> {
    await wait();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], status: users[idx].status === 'Active' ? 'Inactive' : 'Active' };
    return users[idx];
  },

  async getRolePermissions(): Promise<RolePermission[]> {
    await wait(appConfig.mockLatency.fast);
    return rolePermissions;
  },
};
