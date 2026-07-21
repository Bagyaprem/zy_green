export type CustomerStatus = 'Active' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  deviceCount: number;
  userCount: number;
  status: CustomerStatus;
  plan: 'Starter' | 'Professional' | 'Enterprise';
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  plan: Customer['plan'];
}

export interface GeneratedCredentials {
  username: string;
  password: string;
  issuedAt: string;
}
