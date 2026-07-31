import { z } from 'zod';

export const customerFormSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  companyName: z.string().min(2, 'Company name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  address: z.string().min(3, 'Address is required'),
  status: z.enum(['Active', 'Inactive']),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
