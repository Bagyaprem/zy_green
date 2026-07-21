import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { deviceService } from '@/services/deviceService';
import { firmwareService } from '@/services/firmwareService';
import type { FirmwareVersion } from '@/types';

interface DeployFirmwareDialogProps {
  firmware: FirmwareVersion | null;
  onOpenChange: (open: boolean) => void;
}

export function DeployFirmwareDialog({ firmware, onOpenChange }: DeployFirmwareDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({ queryKey: ['devices-lite'], queryFn: () => deviceService.getDevices(), enabled: !!firmware });
  const eligibleDevices = devicesQuery.data?.filter((d) => d.model === firmware?.model) ?? [];

  const mutation = useMutation({
    mutationFn: () => firmwareService.deploy(selected, firmware!.version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-device-status'] });
      queryClient.invalidateQueries({ queryKey: ['firmware-history'] });
      toast.success(`Deployed ${firmware?.version} to ${selected.length} device(s)`);
      setSelected([]);
      onOpenChange(false);
    },
    onError: () => toast.error('Firmware deployment failed'),
  });

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={!!firmware} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy {firmware?.version}</DialogTitle>
          <DialogDescription>Select {firmware?.model} devices to receive this firmware update.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {eligibleDevices.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">No devices found for this model.</p>}
          {eligibleDevices.map((device) => (
            <label key={device.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
              <Checkbox checked={selected.includes(device.id)} onCheckedChange={() => toggle(device.id)} />
              <span className="text-sm text-foreground">{device.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{device.firmwareVersion}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selected.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Deploy to {selected.length || ''} Device{selected.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
