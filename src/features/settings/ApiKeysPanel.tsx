import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { settingsService } from '@/services/settingsService';
import { formatDateTime, formatRelativeTime } from '@/utils/format';

const schema = z.object({ label: z.string().min(2, 'Give this key a descriptive label') });
type FormValues = z.infer<typeof schema>;

export function ApiKeysPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: keys = [], isLoading } = useQuery({ queryKey: ['settings-api-keys'], queryFn: settingsService.getApiKeys });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { label: '' } });

  const generateMutation = useMutation({
    mutationFn: (v: FormValues) => settingsService.generateApiKey(v.label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] });
      toast.success('API key generated');
      form.reset();
      setOpen(false);
    },
    onError: () => toast.error('Failed to generate API key'),
  });

  const revokeMutation = useMutation({
    mutationFn: settingsService.revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] });
      toast.success('API key revoked');
    },
  });

  if (isLoading) return <CardSkeleton className="h-72 w-full" />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage keys used by external integrations to access the ZYGREEN API.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              Generate Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>This key will only be shown once. Store it securely.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => generateMutation.mutate(v))} className="space-y-4">
                <FormField control={form.control} name="label" render={({ field }) => (
                  <FormItem><FormLabel>Label</FormLabel><FormControl><Input placeholder="e.g. Mobile App" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={generateMutation.isPending}>
                    {generateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Generate
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{key.label}</p>
                <Badge variant={key.status === 'Active' ? 'success' : 'muted'}>{key.status}</Badge>
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{key.keyPreview}</p>
              <p className="text-[11px] text-muted-foreground">
                Created {formatDateTime(key.createdAt)} &middot; Last used {formatRelativeTime(key.lastUsedAt)}
              </p>
            </div>
            {key.status === 'Active' && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" title="Revoke">
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                }
                title="Revoke API key?"
                description={`Applications using "${key.label}" will immediately lose access.`}
                confirmLabel="Revoke"
                onConfirm={() => revokeMutation.mutate(key.id)}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
