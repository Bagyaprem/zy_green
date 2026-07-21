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
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { settingsService } from '@/services/settingsService';

const schema = z.object({
  host: z.string().min(2, 'SMTP host is required'),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(2, 'Username is required'),
  fromAddress: z.string().email('Enter a valid email'),
  useTls: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function SmtpSettingsForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-smtp'], queryFn: settingsService.getSmtpSettings });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { host: '', port: 587, username: '', fromAddress: '', useTls: true },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: settingsService.updateSmtpSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-smtp'] });
      toast.success('SMTP settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <CardSkeleton className="h-72 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP / Email</CardTitle>
        <CardDescription>Outbound mail relay used for alert emails and customer invitations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="host" render={({ field }) => (
                <FormItem><FormLabel>SMTP Host</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="port" render={({ field }) => (
                <FormItem><FormLabel>Port</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="fromAddress" render={({ field }) => (
                <FormItem><FormLabel>From Address</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="useTls" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <FormLabel>Use TLS</FormLabel>
                  <p className="text-xs text-muted-foreground">Encrypt SMTP connections using TLS.</p>
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
