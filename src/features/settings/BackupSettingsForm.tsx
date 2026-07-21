import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DownloadCloud, Loader2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { settingsService } from '@/services/settingsService';
import { formatDateTime } from '@/utils/format';

const schema = z.object({
  autoBackupEnabled: z.boolean(),
  backupFrequency: z.enum(['Daily', 'Weekly', 'Monthly']),
});

type FormValues = z.infer<typeof schema>;

export function BackupSettingsForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-backup'], queryFn: settingsService.getBackupSettings });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { autoBackupEnabled: true, backupFrequency: 'Daily' } });

  useEffect(() => {
    if (data) form.reset({ autoBackupEnabled: data.autoBackupEnabled, backupFrequency: data.backupFrequency });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => settingsService.updateBackupSettings({ ...v, lastBackupAt: data?.lastBackupAt ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-backup'] });
      toast.success('Backup settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const runBackupMutation = useMutation({
    mutationFn: settingsService.runBackupNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-backup'] });
      toast.success('Backup completed successfully');
    },
    onError: () => toast.error('Backup failed'),
  });

  if (isLoading) return <CardSkeleton className="h-72 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Restore</CardTitle>
        <CardDescription>Export a full snapshot of platform data, or configure automated backups.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Last Backup</p>
          <p className="mt-1 text-sm font-medium text-foreground">{data?.lastBackupAt ? formatDateTime(data.lastBackupAt) : 'Never'}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="autoBackupEnabled" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <FormLabel>Automatic Backups</FormLabel>
                  <p className="text-xs text-muted-foreground">Automatically back up platform data on a schedule.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="backupFrequency" render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {['Daily', 'Weekly', 'Monthly'].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={() => runBackupMutation.mutate()} disabled={runBackupMutation.isPending}>
                {runBackupMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                Backup Now
              </Button>
              <Button type="button" variant="outline" onClick={() => toast.info('Select a backup file to restore (demo only)')}>
                <UploadCloud className="h-4 w-4" />
                Restore from File
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
