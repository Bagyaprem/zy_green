import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { MachineSelect } from '@/components/shared/MachineSelect';
import { customerService } from '@/services/customerService';
import { machineService } from '@/services/machineService';
import { wifiService } from '@/services/wifiService';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime, formatUptime } from '@/utils/format';

const WIFI_STATUS_VARIANT = { Connected: 'success', Disconnected: 'danger', Connecting: 'warning' } as const;

export function AccountSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const customerQuery = useQuery({
    queryKey: ['customer', user?.customerId],
    queryFn: () => customerService.getCustomer(user!.customerId!),
    enabled: !!user?.customerId,
  });

  const machinesQuery = useQuery({ queryKey: ['machines'], queryFn: () => machineService.getMachines(), enabled: !!user?.customerId });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (customerQuery.data) {
      setName(customerQuery.data.customerName);
      setPhone(customerQuery.data.phone);
      setEmail(customerQuery.data.email);
    }
  }, [customerQuery.data]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.customerId) throw new Error('No account found');
      await customerService.updateCustomer(user.customerId, { customerName: name, phone, email });
      if (email !== customerQuery.data?.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', user?.customerId] });
      toast.success('Profile updated successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update profile'),
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      if (!user?.email) throw new Error('No account found');

      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to change password'),
  });

  const [wifiMachineId, setWifiMachineId] = useState('');
  const activeWifiMachineId = wifiMachineId || machinesQuery.data?.[0]?.id || '';
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const wifiQuery = useQuery({
    queryKey: ['machine-wifi', activeWifiMachineId],
    queryFn: () => wifiService.getWifi(activeWifiMachineId),
    enabled: !!activeWifiMachineId,
  });

  useEffect(() => {
    if (wifiQuery.data) {
      setSsid(wifiQuery.data.ssid);
      setWifiPassword(wifiQuery.data.password);
    }
  }, [wifiQuery.data]);

  const wifiMutation = useMutation({
    mutationFn: () => wifiService.saveWifi(activeWifiMachineId, { ssid, password: wifiPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-wifi', activeWifiMachineId] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('WiFi configuration has been updated successfully.');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update WiFi configuration'),
  });

  if (!user?.customerId) {
    return (
      <div className="space-y-5">
        <PageHeader title="Account Settings" description="Manage your profile and password." />
        <EmptyState title="Admin accounts don't have a customer profile" description="Use the Profile page instead." />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Account Settings" description="Manage your account and preferences." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="wifi">WiFi</TabsTrigger>
          <TabsTrigger value="machine-info">Machine Info</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {customerQuery.isLoading ? (
            <CardSkeleton className="h-56 w-full" />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Customer Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => profileMutation.mutate()} disabled={!name.trim() || profileMutation.isPending}>
                    {profileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>You'll need your current password to set a new one.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => passwordMutation.mutate()}
                  disabled={!currentPassword || !newPassword || passwordMutation.isPending}
                >
                  {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wifi">
          {machinesQuery.isLoading ? (
            <CardSkeleton className="h-64 w-full" />
          ) : !machinesQuery.data?.length ? (
            <EmptyState title="No machines yet" />
          ) : (
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>WiFi Configuration</CardTitle>
                  <CardDescription>Last connected {formatRelativeTime(wifiQuery.data?.lastConnectedAt ?? null)}</CardDescription>
                </div>
                <Badge variant={WIFI_STATUS_VARIANT[wifiQuery.data?.connectionStatus ?? 'Disconnected']}>
                  {wifiQuery.data?.connectionStatus === 'Connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {wifiQuery.data?.connectionStatus ?? 'Disconnected'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {machinesQuery.data.length > 1 && (
                  <div className="max-w-xs space-y-2">
                    <Label>Machine</Label>
                    <MachineSelect value={activeWifiMachineId} onChange={setWifiMachineId} />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>WiFi SSID</Label>
                    <Input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Network name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showWifiPassword ? 'text' : 'password'}
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        placeholder="Network password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWifiPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showWifiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">IP Address</p>
                    <p className="text-sm font-medium text-foreground">{wifiQuery.data?.ipAddress || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">MAC Address</p>
                    <p className="text-sm font-medium text-foreground">{wifiQuery.data?.macAddress || '-'}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => wifiMutation.mutate()} disabled={!ssid.trim() || wifiMutation.isPending}>
                    {wifiMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save WiFi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="machine-info">
          <Card>
            <CardHeader>
              <CardTitle>Your Machines</CardTitle>
              <CardDescription>Read-only — contact ZYGREEN support to change machine configuration. Update WiFi from the WiFi tab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {machinesQuery.isLoading ? (
                <CardSkeleton className="h-32 w-full" />
              ) : !machinesQuery.data?.length ? (
                <EmptyState title="No machines yet" />
              ) : (
                machinesQuery.data.map((m) => (
                  <div key={m.id} className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{m.machineName}</p>
                      <Badge variant={m.status === 'Active' ? 'success' : 'muted'}>{m.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Machine UID</p>
                        <p className="font-medium text-foreground">{m.machineCode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Firmware</p>
                        <p className="font-medium text-foreground">{m.firmwareVersion ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Uptime</p>
                        <p className="font-medium text-foreground">{formatUptime(m.uptimeSeconds)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium text-foreground">{m.location || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
