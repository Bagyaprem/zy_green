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
  provider: z.enum(['Supabase', 'Firebase', 'PostgreSQL']),
  host: z.string().min(2, 'Host is required'),
  retentionDays: z.coerce.number().int().min(1).max(3650),
  autoBackup: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function DatabaseSettingsForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-database'], queryFn: settingsService.getDatabaseSettings });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { provider: 'Supabase', host: '', retentionDays: 90, autoBackup: true },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: settingsService.updateDatabaseSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-database'] });
      toast.success('Database settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <CardSkeleton className="h-72 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database</CardTitle>
        <CardDescription>Connection and retention settings for the platform data store.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="provider" render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['Supabase', 'Firebase', 'PostgreSQL'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="host" render={({ field }) => (
                <FormItem><FormLabel>Host</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="retentionDays" render={({ field }) => (
              <FormItem><FormLabel>Data Retention (days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="autoBackup" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <FormLabel>Automatic Backups</FormLabel>
                  <p className="text-xs text-muted-foreground">Automatically back up the database on a recurring schedule.</p>
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
