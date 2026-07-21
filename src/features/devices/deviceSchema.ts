import { z } from 'zod';

export const deviceFormSchema = z.object({
  name: z.string().min(2, 'Device name is required'),
  customerId: z.string().min(1, 'Select a customer'),
  location: z.string().min(2, 'Location is required'),
  model: z.string().min(1, 'Select a model'),
  serialNumber: z.string().min(3, 'Serial number is required'),
  macAddress: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'Use format AA:BB:CC:DD:EE:FF'),
  timezone: z.string().min(1, 'Timezone is required'),
  uploadIntervalSec: z.coerce.number().int().min(10, 'Minimum interval is 10 seconds').max(3600, 'Maximum interval is 3600 seconds'),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;
