import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { CreateCustomerInput, Customer, GeneratedCredentials } from '@/types';
import { generateId } from '@/utils/id';

interface CustomerRow {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: Customer['status'];
  plan: Customer['plan'];
  created_at: string;
  device_count?: number;
  user_count?: number;
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone ?? '',
    address: row.address ?? '',
    deviceCount: row.device_count ?? 0,
    userCount: row.user_count ?? 0,
    status: row.status,
    plan: row.plan,
    createdAt: row.created_at,
  };
}

export const customerService = {
  async getCustomers(search?: string): Promise<Customer[]> {
    assertSupabaseConfigured();
    // customers_with_counts is a view joining live device/user counts (see supabase_admin_schema.sql)
    let query = supabase.from('customers_with_counts').select('*').order('name', { ascending: true });
    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as CustomerRow[]).map(mapCustomer);
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('customers_with_counts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapCustomer(data as CustomerRow) : undefined;
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        id: generateId('CUST'),
        name: input.name,
        contact_name: input.contactName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        plan: input.plan,
        status: 'Active',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapCustomer({ ...(data as CustomerRow), device_count: 0, user_count: 0 });
  },

  async updateCustomer(id: string, input: Partial<CreateCustomerInput> & { status?: Customer['status'] }): Promise<Customer> {
    assertSupabaseConfigured();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.contactName !== undefined) patch.contact_name = input.contactName;
    if (input.email !== undefined) patch.email = input.email;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.address !== undefined) patch.address = input.address;
    if (input.plan !== undefined) patch.plan = input.plan;
    if (input.status !== undefined) patch.status = input.status;

    const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return mapCustomer(data as CustomerRow);
  },

  async deleteCustomer(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  async assignDevice(customerId: string, deviceId: string): Promise<void> {
    assertSupabaseConfigured();
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .single();
    if (customerError) throw customerError;

    const { error } = await supabase
      .from('devices')
      .update({ customer_id: customerId, customer_name: customer.name })
      .eq('id', deviceId);
    if (error) throw error;
  },

  // The operations below issue real credentials/emails and must happen
  // server-side (never generate secrets in the browser). They call Supabase
  // Edge Functions that are not deployed by supabase_admin_schema.sql —
  // with placeholder credentials these calls fail gracefully, same as every
  // other Supabase call in this app.

  async generateCredentials(customerId: string): Promise<GeneratedCredentials> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.functions.invoke('generate-customer-credentials', {
      body: { customerId },
    });
    if (error) throw error;
    return data as GeneratedCredentials;
  },

  async resetPassword(customerId: string): Promise<GeneratedCredentials> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.functions.invoke('reset-customer-password', {
      body: { customerId },
    });
    if (error) throw error;
    return data as GeneratedCredentials;
  },

  async sendInvitation(customerId: string): Promise<{ sentTo: string; sentAt: string }> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.functions.invoke('send-customer-invitation', {
      body: { customerId },
    });
    if (error) throw error;
    return data as { sentTo: string; sentAt: string };
  },
};
