import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { customerService } from '@/services/customerService';
import { generateLoginEmail, generateSimplePassword } from '@/utils/credentials';
import { customerFormSchema, type CustomerFormValues } from './customerSchema';
import { GeneratedCredentialsDialog, type GeneratedCredentials } from './GeneratedCredentialsDialog';

export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [createLogin, setCreateLogin] = useState(false);
  const [pendingPassword, setPendingPassword] = useState('');
  const [revealedCredentials, setRevealedCredentials] = useState<GeneratedCredentials | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { customerName: '', companyName: '', email: '', phone: '', address: '', status: 'Active' },
  });

  const customerName = form.watch('customerName');
  const phone = form.watch('phone');

  // While "create login" is on, the email field IS the login username, and
  // the password is derived from name+phone — keep both in sync as either changes.
  useEffect(() => {
    if (createLogin) {
      form.setValue('email', generateLoginEmail(customerName || 'customer'));
      setPendingPassword(generateSimplePassword(customerName || 'customer', phone || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createLogin, customerName, phone]);

  const handleToggleLogin = (checked: boolean) => {
    setCreateLogin(checked);
    if (checked) {
      setPendingPassword(generateSimplePassword(customerName || 'customer', phone || ''));
      form.setValue('email', generateLoginEmail(customerName || 'customer'));
    } else {
      form.setValue('email', '');
    }
  };

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      customerService.createCustomer({ ...values, password: createLogin ? pendingPassword : undefined }),
    onSuccess: (_customer, values) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-lite'] });
      toast.success('Customer created successfully');
      if (createLogin) {
        setRevealedCredentials({ loginEmail: values.email, password: pendingPassword });
      }
      form.reset();
      setCreateLogin(false);
      setOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create customer'),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Add a new customer organization to ZYGREEN.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Prem Kumar" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Coimbatore Textiles Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <Label>Create login for this customer</Label>
                  <p className="text-xs text-muted-foreground">Auto-generates a username, and a password from their name + phone number.</p>
                </div>
                <Switch checked={createLogin} onCheckedChange={handleToggleLogin} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{createLogin ? 'Login Username (auto-generated)' : 'Email'}</FormLabel>
                      <FormControl>
                        <Input type={createLogin ? 'text' : 'email'} readOnly={createLogin} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Active', 'Inactive'].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Customer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <GeneratedCredentialsDialog credentials={revealedCredentials} onOpenChange={(o) => !o && setRevealedCredentials(null)} />
    </>
  );
}
