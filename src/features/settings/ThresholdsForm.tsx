import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { settingsService } from '@/services/settingsService';

const schema = z.object({
  thresholds: z.array(
    z.object({
      parameter: z.string(),
      unit: z.string(),
      warning: z.coerce.number(),
      danger: z.coerce.number(),
    })
  ),
});

type FormValues = z.infer<typeof schema>;

export function ThresholdsForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-thresholds'], queryFn: settingsService.getThresholds });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { thresholds: [] } });
  const { fields } = useFieldArray({ control: form.control, name: 'thresholds' });

  useEffect(() => {
    if (data) form.reset({ thresholds: data });
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => settingsService.updateThresholds(values.thresholds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-thresholds'] });
      toast.success('Thresholds saved');
    },
    onError: () => toast.error('Failed to save thresholds'),
  });

  if (isLoading) return <CardSkeleton className="h-96 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Thresholds</CardTitle>
        <CardDescription>Warning and danger thresholds used to trigger device alerts per parameter.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parameter</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-warning">Warning</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-danger">Danger</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{field.parameter}</td>
                    <td className="px-3 py-2 text-muted-foreground">{field.unit || '-'}</td>
                    <td className="px-3 py-2">
                      <Input type="number" step="any" className="h-8 w-24" {...form.register(`thresholds.${index}.warning`)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="any" className="h-8 w-24" {...form.register(`thresholds.${index}.danger`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Thresholds
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
