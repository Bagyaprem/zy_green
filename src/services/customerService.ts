import { supabase, assertSupabaseConfigured, createThrowawayAuthClient } from './supabaseClient';
import { sanitizeSearchTerm } from '@/utils/search';
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from '@/types';

interface CustomerRow {
  id: string;
  customer_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  status: Customer['status'];
  created_at: string;
}

function mapCustomer(row: CustomerRow, machineCount = 0): Customer {
  return {
    id: row.id,
    customerName: row.customer_name,
    companyName: row.company_name ?? '',
    email: row.email,
    phone: row.phone ?? '',
    address: row.address ?? '',
    machineCount,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** No customers_with_counts view exists — tally machine counts per customer with a plain query. */
async function getMachineCounts(customerIds: string[]): Promise<Map<string, number>> {
  if (customerIds.length === 0) return new Map();
  const { data, error } = await supabase.from('machines').select('customer_id').in('customer_id', customerIds);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.customer_id) continue;
    counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  }
  return counts;
}

export const customerService = {
  async getCustomers(search?: string): Promise<Customer[]> {
    assertSupabaseConfigured();
    let query = supabase.from('customers').select('*').order('customer_name', { ascending: true });
    const q = search ? sanitizeSearchTerm(search) : '';
    if (q) {
      query = query.or(`customer_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = data as CustomerRow[];
    const counts = await getMachineCounts(rows.map((r) => r.id));
    return rows.map((row) => mapCustomer(row, counts.get(row.id) ?? 0));
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return undefined;
    const counts = await getMachineCounts([id]);
    return mapCustomer(data as CustomerRow, counts.get(id) ?? 0);
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    assertSupabaseConfigured();

    // Create the login account first (on a throwaway client so it doesn't sign the admin out
    // of their own session) — if this fails, we don't want an orphaned customer record with no
    // way to log in, so nothing is written to the customers table yet.
    if (input.password) {
      const authClient = createThrowawayAuthClient();
      const { error: authError } = await authClient.auth.signUp({ email: input.email, password: input.password });
      if (authError) throw authError;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_name: input.customerName,
        company_name: input.companyName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        status: input.status,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapCustomer(data as CustomerRow, 0);
  },

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    assertSupabaseConfigured();
    const patch: Record<string, unknown> = {};
    if (input.customerName !== undefined) patch.customer_name = input.customerName;
    if (input.companyName !== undefined) patch.company_name = input.companyName;
    if (input.email !== undefined) patch.email = input.email;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.address !== undefined) patch.address = input.address;
    if (input.status !== undefined) patch.status = input.status;
    patch.updated_at = new Date().toISOString();

    const { error } = await supabase.from('customers').update(patch).eq('id', id);
    if (error) throw error;
    const customer = await customerService.getCustomer(id);
    if (!customer) throw new Error('Customer was updated but could not be re-fetched.');
    return customer;
  },

  async deleteCustomer(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },
};
