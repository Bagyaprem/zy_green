import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { AppUser, CreateUserInput, RolePermission } from '@/types';
import { generateId } from '@/utils/id';

const avatarColors = ['#2E7D32', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#EC4899'];

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: AppUser['role'];
  status: AppUser['status'];
  customer_id: string | null;
  last_login: string | null;
  created_at: string;
  avatar_color: string;
  customers?: { name: string } | null;
}

function mapUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? null,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    avatarColor: row.avatar_color,
  };
}

export const userService = {
  async getUsers(search?: string): Promise<AppUser[]> {
    assertSupabaseConfigured();
    let query = supabase.from('profiles').select('*, customers(name)').order('name', { ascending: true });
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as ProfileRow[]).map(mapUser);
  },

  async getUser(id: string): Promise<AppUser | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('profiles').select('*, customers(name)').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapUser(data as ProfileRow) : undefined;
  },

  async createUser(input: CreateUserInput): Promise<AppUser> {
    assertSupabaseConfigured();
    // A real signup would go through Supabase Auth (invite email + set
    // password); this inserts the profile row the admin console displays.
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: generateId('USR').toLowerCase(),
        name: input.name,
        email: input.email,
        role: input.role,
        customer_id: input.customerId,
        status: 'Active',
        avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      })
      .select('*, customers(name)')
      .single();
    if (error) throw error;
    return mapUser(data as ProfileRow);
  },

  async updateUser(id: string, input: Partial<CreateUserInput> & { status?: AppUser['status'] }): Promise<AppUser> {
    assertSupabaseConfigured();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.email !== undefined) patch.email = input.email;
    if (input.role !== undefined) patch.role = input.role;
    if (input.customerId !== undefined) patch.customer_id = input.customerId;
    if (input.status !== undefined) patch.status = input.status;

    const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('*, customers(name)').single();
    if (error) throw error;
    return mapUser(data as ProfileRow);
  },

  async deleteUser(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleStatus(id: string): Promise<AppUser> {
    assertSupabaseConfigured();
    const { data: current, error: fetchError } = await supabase.from('profiles').select('status').eq('id', id).single();
    if (fetchError) throw fetchError;
    const nextStatus = current.status === 'Active' ? 'Inactive' : 'Active';
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: nextStatus })
      .eq('id', id)
      .select('*, customers(name)')
      .single();
    if (error) throw error;
    return mapUser(data as ProfileRow);
  },

  async getRolePermissions(): Promise<RolePermission[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error) throw error;
    return (data ?? []).map((row) => ({
      role: row.role,
      description: row.description,
      permissions: row.permissions,
    }));
  },
};
