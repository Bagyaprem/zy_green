import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { authService, DEV_LOGIN_EMAIL, DEV_LOGIN_PASSWORD } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { environment } from '@/config/environment';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await authService.login(values);
      login(user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const fillDevCredentials = () => {
    form.setValue('email', DEV_LOGIN_EMAIL, { shouldValidate: true });
    form.setValue('password', DEV_LOGIN_PASSWORD, { shouldValidate: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/logo.png" alt="ZYGREEN" className="h-14 w-14 rounded-full shadow-soft" />
          <h1 className="text-lg font-semibold text-foreground">ZYGREEN</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Username</FormLabel>
                    <FormControl>
                      <Input placeholder="you@zygreen.io" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" {...field} />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
              {environment.isSupabaseConfigured ? null : (
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                  <p>
                    No Supabase project connected yet — use the temporary dev login:
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-foreground">
                    {DEV_LOGIN_EMAIL} / {DEV_LOGIN_PASSWORD}
                  </p>
                  <button
                    type="button"
                    onClick={fillDevCredentials}
                    className="mt-2 font-medium text-primary hover:underline"
                  >
                    Fill dev credentials
                  </button>
                </div>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
