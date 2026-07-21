import { z } from 'zod';

export const customerFormSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  address: z.string().min(3, 'Address / location is required'),
  plan: z.enum(['Starter', 'Professional', 'Enterprise']),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
