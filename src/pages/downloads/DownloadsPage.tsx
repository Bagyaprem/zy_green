import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { ReportRequest } from '@/types';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { MachineSelect } from '@/components/shared/MachineSelect';
import { sensorService } from '@/services/sensorService';
import { reportService } from '@/services/reportService';
import { exportToCsv } from '@/utils/csv';
import { formatDate, formatDateTime } from '@/utils/format';

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ReportDownloadButton({ report }: { report: ReportRequest }) {
  const [loading, setLoading] = useState(false);

  if (!report.fileUrl) return null;

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = await reportService.getDownloadUrl(report.fileUrl!);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get download link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
    </Button>
  );
}

export function DownloadsPage() {
  const [machineId, setMachineId] = useState('');
  const [from, setFrom] = useState(toDateInput(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(toDateInput(new Date()));

  const reportsQuery = useQuery({ queryKey: ['report-requests'], queryFn: reportService.getReportRequests });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const rows = await sensorService.getHistory(machineId, new Date(from).toISOString(), new Date(`${to}T23:59:59`).toISOString());
      if (!rows.length) throw new Error('No sensor data in that date range');
      exportToCsv(`zygreen-sensor-data-${from}-to-${to}`, rows.map((r) => ({
        recorded_at: r.recordedAt,
        aqi: r.aqi ?? '',
        co2: r.co2 ?? '',
        temperature: r.temperature ?? '',
        humidity: r.humidity ?? '',
        pm1_0: r.pm1_0 ?? '',
        pm2_5: r.pm2_5 ?? '',
        pm4_0: r.pm4_0 ?? '',
        pm10: r.pm10 ?? '',
      })));
    },
    onSuccess: () => toast.success('Sensor data downloaded'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to download sensor data'),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Downloads" description="Export raw sensor data for your machines." />

      <Card>
        <CardHeader>
          <CardTitle>Download Sensor Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Machine</Label>
              <MachineSelect value={machineId} onChange={setMachineId} />
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!machineId || downloadMutation.isPending} onClick={() => downloadMutation.mutate()}>
              {downloadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Need a PDF/CSV/Excel report emailed to you? Request one with delivery email on the{' '}
              <Link to="/reports" className="font-medium text-primary hover:underline">
                Reports page
              </Link>
              .
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/reports">
              <FileText className="h-3.5 w-3.5" />
              Request Report
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {reportsQuery.isLoading ? (
            <CardSkeleton className="h-48 w-full" />
          ) : reportsQuery.isError ? (
            <ErrorState onRetry={() => reportsQuery.refetch()} />
          ) : !reportsQuery.data?.length ? (
            <EmptyState title="No reports yet" description="Generate one from the Reports page." />
          ) : (
            <div className="space-y-1">
              {reportsQuery.data.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {r.reportType} Report &middot; {formatDate(r.reportFrom)} – {formatDate(r.reportTo)}
                    </p>
                    <p className="text-xs text-muted-foreground">Requested {formatDateTime(r.requestedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'Ready' ? 'success' : r.status === 'Failed' ? 'danger' : 'warning'}>{r.status}</Badge>
                    <ReportDownloadButton report={r} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
