import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { settingsService } from '@/services/settingsService';

const schema = z.object({
  autoUpdate: z.boolean(),
  channel: z.enum(['Stable', 'Beta']),
  updateWindowStart: z.string().min(1),
  updateWindowEnd: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function FirmwarePolicyForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-firmware-policy'], queryFn: settingsService.getFirmwarePolicy });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { autoUpdate: false, channel: 'Stable', updateWindowStart: '01:00', updateWindowEnd: '04:00' },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: settingsService.updateFirmwarePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-firmware-policy'] });
      toast.success('Firmware policy saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <CardSkeleton className="h-72 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firmware Update Policy</CardTitle>
        <CardDescription>Control how and when OTA firmware updates are rolled out automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="autoUpdate" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <FormLabel>Automatic Updates</FormLabel>
                  <p className="text-xs text-muted-foreground">Automatically deploy new firmware to eligible devices.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="channel" render={({ field }) => (
              <FormItem>
                <FormLabel>Release Channel</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {['Stable', 'Beta'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="updateWindowStart" render={({ field }) => (
                <FormItem><FormLabel>Update Window Start</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="updateWindowEnd" render={({ field }) => (
                <FormItem><FormLabel>Update Window End</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
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
