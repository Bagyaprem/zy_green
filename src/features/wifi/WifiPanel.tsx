import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Lock, RefreshCw, Signal, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { wifiService } from '@/services/wifiService';
import { cn } from '@/lib/utils';
import type { WifiNetwork } from '@/types';

export function WifiPanel({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient();
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState('');

  const configQuery = useQuery({ queryKey: ['wifi-config', deviceId], queryFn: () => wifiService.getConfig(deviceId) });

  const scanMutation = useMutation({
    mutationFn: wifiService.scanNetworks,
    onError: () => toast.error('WiFi scan failed'),
  });

  const connectMutation = useMutation({
    mutationFn: (input: { ssid: string; password: string }) => wifiService.saveConfiguration({ deviceId, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wifi-config', deviceId] });
      toast.success(`Connected to ${selectedNetwork?.ssid}`);
      setSelectedNetwork(null);
      setPassword('');
    },
    onError: () => toast.error('Failed to connect to network'),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => wifiService.disconnect(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wifi-config', deviceId] });
      toast.success('Device disconnected from WiFi');
    },
  });

  if (configQuery.isLoading) return <CardSkeleton className="h-64 w-full" />;

  const config = configQuery.data;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Current Connection</CardTitle>
          <CardDescription>Live WiFi status reported by the device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', config?.connected ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                {config?.connected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{config?.ssid || 'Not connected'}</p>
                <p className="text-xs text-muted-foreground">{config?.ipAddress || '-'}</p>
              </div>
            </div>
            <Badge variant={config?.connected ? 'success' : 'danger'}>{config?.connected ? 'Connected' : 'Disconnected'}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Signal className="h-4 w-4" /> Signal Strength
            </span>
            <span className="font-medium text-foreground">{config?.signal ?? 0}%</span>
          </div>
          {config?.connected && (
            <Button variant="outline" size="sm" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
              {disconnectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Disconnect
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Available Networks</CardTitle>
            <CardDescription>Scan for nearby WiFi networks to connect this device.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            {scanMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Scan
          </Button>
        </CardHeader>
        <CardContent>
          {!scanMutation.data && !scanMutation.isPending && (
            <p className="py-6 text-center text-xs text-muted-foreground">Click Scan to discover nearby networks.</p>
          )}
          {scanMutation.isPending && <CardSkeleton className="h-32 w-full" />}
          <div className="space-y-1">
            {scanMutation.data?.map((network) => (
              <button
                key={network.ssid}
                onClick={() => setSelectedNetwork(network)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{network.ssid}</span>
                  {network.secure && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <span className="text-xs text-muted-foreground">{network.signal}%</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedNetwork} onOpenChange={(open) => !open && setSelectedNetwork(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to {selectedNetwork?.ssid}</DialogTitle>
            <DialogDescription>Enter the network password to save this WiFi configuration to the device.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="wifi-password">Password</Label>
            <Input
              id="wifi-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={selectedNetwork?.secure ? 'Enter WiFi password' : 'Open network - no password required'}
              disabled={!selectedNetwork?.secure}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNetwork(null)}>
              Cancel
            </Button>
            <Button
              disabled={connectMutation.isPending}
              onClick={() => selectedNetwork && connectMutation.mutate({ ssid: selectedNetwork.ssid, password })}
            >
              {connectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Connect & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
