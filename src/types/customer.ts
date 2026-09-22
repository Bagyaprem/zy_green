export type CustomerStatus = 'Active' | 'Inactive';

export interface Customer {
  id: string;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  machineCount: number;
  status: CustomerStatus;
  createdAt: string;
}

export interface CreateCustomerInput {
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  /** Optional — if set, creates a real login account for this customer alongside the record. */
  password?: string;
}

/**
 * Email is not updatable. It is the customer's login identity AND the key
 * current_customer_id() matches the JWT against for every RLS policy, but
 * customers.email is just a copy — writing it leaves auth.users on the old
 * address, so the customer can no longer sign in or see their own data. See
 * AccountSettingsPage for the full reasoning.
 */
export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, 'email' | 'password'>>;
