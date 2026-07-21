import customersData from '@/mock/customers.json';
import type { CreateCustomerInput, Customer, GeneratedCredentials } from '@/types';
import { wait } from '@/utils/latency';
import { generateId } from '@/utils/id';
import { appConfig } from '@/config/config';
import { deviceService } from './deviceService';

let customers: Customer[] = JSON.parse(JSON.stringify(customersData)) as Customer[];

export const customerService = {
  async getCustomers(search?: string): Promise<Customer[]> {
    await wait();
    let result = customers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  },

  async getCustomer(id: string): Promise<Customer | undefined> {
    await wait(appConfig.mockLatency.fast);
    return customers.find((c) => c.id === id);
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    await wait(appConfig.mockLatency.slow);
    const newCustomer: Customer = {
      id: generateId('CUST'),
      name: input.name,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      deviceCount: 0,
      userCount: 0,
      status: 'Active',
      plan: input.plan,
      createdAt: new Date().toISOString(),
    };
    customers = [newCustomer, ...customers];
    return newCustomer;
  },

  async updateCustomer(id: string, input: Partial<CreateCustomerInput> & { status?: Customer['status'] }): Promise<Customer> {
    await wait();
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Customer not found');
    customers[idx] = { ...customers[idx], ...input };
    return customers[idx];
  },

  async deleteCustomer(id: string): Promise<void> {
    await wait();
    customers = customers.filter((c) => c.id !== id);
  },

  async assignDevice(customerId: string, deviceId: string): Promise<void> {
    await wait(appConfig.mockLatency.slow);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');
    await deviceService.updateDevice(deviceId, { customerId });
    customer.deviceCount += 1;
  },

  async generateCredentials(customerId: string): Promise<GeneratedCredentials> {
    await wait(appConfig.mockLatency.slow);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');
    const username = `${customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')}@zygreen.io`;
    const password = `Zyg-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}!`;
    return { username, password, issuedAt: new Date().toISOString() };
  },

  async resetPassword(customerId: string): Promise<GeneratedCredentials> {
    await wait(appConfig.mockLatency.slow);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');
    const password = `Zyg-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}!`;
    return { username: customer.email, password, issuedAt: new Date().toISOString() };
  },

  async sendInvitation(customerId: string): Promise<{ sentTo: string; sentAt: string }> {
    await wait(appConfig.mockLatency.slow);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');
    return { sentTo: customer.email, sentAt: new Date().toISOString() };
  },
};
