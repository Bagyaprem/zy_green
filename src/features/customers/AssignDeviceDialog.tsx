import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { deviceService } from '@/services/deviceService';
import { customerService } from '@/services/customerService';
import type { Customer } from '@/types';

interface AssignDeviceDialogProps {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
}

export function AssignDeviceDialog({ customer, onOpenChange }: AssignDeviceDialogProps) {
  const [deviceId, setDeviceId] = useState('');
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({ queryKey: ['devices-lite'], queryFn: () => deviceService.getDevices(), enabled: !!customer });

  const mutation = useMutation({
    mutationFn: () => customerService.assignDevice(customer!.id, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device assigned successfully');
      setDeviceId('');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to assign device'),
  });

  const unassignedDevices = devicesQuery.data?.filter((d) => d.customerId !== customer?.id) ?? [];

  return (
    <Dialog open={!!customer} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Device</DialogTitle>
          <DialogDescription>Assign an existing device to {customer?.name}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Device</Label>
          <Select value={deviceId} onValueChange={setDeviceId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a device" />
            </SelectTrigger>
            <SelectContent>
              {unassignedDevices.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.id} &middot; {d.name} ({d.customerName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!deviceId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
