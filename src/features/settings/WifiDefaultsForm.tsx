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
  defaultSsidPrefix: z.string().min(2, 'Prefix is required'),
  autoReconnect: z.boolean(),
  preferredBand: z.enum(['2.4GHz', '5GHz', 'Auto']),
  connectionTimeoutSec: z.coerce.number().int().min(5).max(300),
});

type FormValues = z.infer<typeof schema>;

export function WifiDefaultsForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-wifi-defaults'], queryFn: settingsService.getWifiDefaults });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { defaultSsidPrefix: '', autoReconnect: true, preferredBand: '2.4GHz', connectionTimeoutSec: 30 },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: settingsService.updateWifiDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-wifi-defaults'] });
      toast.success('WiFi defaults saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <CardSkeleton className="h-72 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>WiFi Defaults</CardTitle>
        <CardDescription>Default WiFi provisioning behavior applied to newly registered devices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="defaultSsidPrefix" render={({ field }) => (
                <FormItem><FormLabel>Default SSID Prefix</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="preferredBand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Band</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['2.4GHz', '5GHz', 'Auto'].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="connectionTimeoutSec" render={({ field }) => (
              <FormItem><FormLabel>Connection Timeout (seconds)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="autoReconnect" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <FormLabel>Auto Reconnect</FormLabel>
                  <p className="text-xs text-muted-foreground">Devices automatically reconnect to the last known network.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
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
