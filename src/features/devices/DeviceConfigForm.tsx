import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { deviceService } from '@/services/deviceService';
import type { Device } from '@/types';

const configSchema = z.object({
  name: z.string().min(2, 'Device name is required'),
  location: z.string().min(2, 'Location is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  uploadIntervalSec: z.coerce.number().int().min(10).max(3600),
  autoRestart: z.boolean(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export function DeviceConfigForm({ device }: { device: Device }) {
  const queryClient = useQueryClient();

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      name: device.name,
      location: device.location,
      timezone: device.timezone,
      uploadIntervalSec: device.uploadIntervalSec,
      autoRestart: device.autoRestart,
    },
  });

  useEffect(() => {
    form.reset({
      name: device.name,
      location: device.location,
      timezone: device.timezone,
      uploadIntervalSec: device.uploadIntervalSec,
      autoRestart: device.autoRestart,
    });
  }, [device, form]);

  const mutation = useMutation({
    mutationFn: (values: ConfigFormValues) => deviceService.updateDevice(device.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device', device.id] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Configuration saved');
    },
    onError: () => toast.error('Failed to save configuration'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Basic device configuration and sync behavior.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Zone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="uploadIntervalSec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Upload Interval (seconds)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="autoRestart"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <FormLabel>Auto Restart</FormLabel>
                    <p className="text-xs text-muted-foreground">Automatically restart the device if it becomes unresponsive.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
