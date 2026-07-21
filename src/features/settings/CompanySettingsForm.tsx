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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { settingsService } from '@/services/settingsService';

const schema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  supportEmail: z.string().email('Enter a valid email'),
  supportPhone: z.string().min(6, 'Enter a valid phone number'),
  address: z.string().min(3, 'Address is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  logoUrl: z.string().min(1, 'Logo path is required'),
});

type FormValues = z.infer<typeof schema>;

export function CompanySettingsForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings-company'], queryFn: settingsService.getCompanySettings });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { companyName: '', supportEmail: '', supportPhone: '', address: '', timezone: '', logoUrl: '' },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: settingsService.updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-company'] });
      toast.success('Company settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <CardSkeleton className="h-80 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Basic organization details shown across the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="companyName" render={({ field }) => (
              <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="supportEmail" render={({ field }) => (
                <FormItem><FormLabel>Support Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="supportPhone" render={({ field }) => (
                <FormItem><FormLabel>Support Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="timezone" render={({ field }) => (
              <FormItem><FormLabel>Time Zone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
