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

export type UpdateCustomerInput = Partial<CreateCustomerInput>;
