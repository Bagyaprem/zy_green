import { z } from 'zod';

export const machineFormSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  machineName: z.string().min(2, 'Machine name is required'),
  machineCode: z.string().min(2, 'Machine code is required'),
  location: z.string().min(2, 'Installation location is required'),
  status: z.enum(['Active', 'Inactive']),
});

export type MachineFormValues = z.infer<typeof machineFormSchema>;
