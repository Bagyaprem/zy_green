import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { firmwareService } from '@/services/firmwareService';
import { formatRelativeTime } from '@/utils/format';

export function DeviceFirmwarePanel({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const statusQuery = useQuery({ queryKey: ['firmware-status', deviceId], queryFn: () => firmwareService.getVersion(deviceId) });

  const deployMutation = useMutation({
    mutationFn: async (version: string) => {
      setProgress(10);
      const timer = setInterval(() => setProgress((p) => (p !== null && p < 90 ? p + 20 : p)), 300);
      await firmwareService.deploy([deviceId], version);
      clearInterval(timer);
      setProgress(100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-status', deviceId] });
      toast.success('Firmware deployed successfully');
      setTimeout(() => setProgress(null), 1200);
    },
    onError: () => {
      toast.error('Firmware deployment failed');
      setProgress(null);
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: () => firmwareService.rollback(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firmware-status', deviceId] });
      toast.success('Firmware rolled back successfully');
    },
    onError: () => toast.error('Rollback failed'),
  });

  if (statusQuery.isLoading) return <CardSkeleton className="h-56 w-full" />;
  const status = statusQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>OTA Firmware Update</CardTitle>
        <CardDescription>Manage over-the-air firmware for this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-[11px] text-muted-foreground">Current Version</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{status?.currentVersion}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-[11px] text-muted-foreground">Latest Available</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-lg font-semibold text-foreground">{status?.latestVersion}</p>
              {status?.updateAvailable && <Badge variant="info">Update available</Badge>}
            </div>
          </div>
        </div>

        {progress !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Deploying firmware...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Last deployed {status?.lastDeployedAt ? formatRelativeTime(status.lastDeployedAt) : 'never'}.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!status?.updateAvailable || deployMutation.isPending}
            onClick={() => status && deployMutation.mutate(status.latestVersion)}
          >
            {deployMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Deploy Latest Firmware
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="outline">
                <RotateCcw className="h-4 w-4" />
                Rollback
              </Button>
            }
            title="Rollback firmware?"
            description="This will revert the device to its previous firmware version. The device may restart during this process."
            confirmLabel="Rollback"
            onConfirm={() => rollbackMutation.mutate()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
