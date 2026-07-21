import { z } from 'zod';

export const userFormSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['Super Admin', 'Admin', 'Operator', 'Viewer']),
  customerId: z.string().nullable(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
