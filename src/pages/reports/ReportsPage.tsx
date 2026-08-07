import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Loader2, Mail, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { MachineSelect } from '@/components/shared/MachineSelect';
import { reportService } from '@/services/reportService';
import { machineService } from '@/services/machineService';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/format';
import type { ReportFileType, ReportRequest, DataSelectionMode } from '@/types';

const REPORT_TYPES: ReportFileType[] = ['PDF', 'CSV', 'Excel'];
const DATA_SELECTIONS: { value: DataSelectionMode; label: string }[] = [
  { value: 'All', label: 'All (Generate)' },
  { value: 'High', label: 'High' },
  { value: 'Low', label: 'Low' },
  { value: 'Median', label: 'Median' },
];
const STATUS_VARIANT = { Pending: 'warning', Generating: 'info', Ready: 'success', Failed: 'danger' } as const;

function DownloadCell({ report }: { report: ReportRequest }) {
  const [loading, setLoading] = useState(false);

  if (!report.fileUrl) return <span className="text-xs text-muted-foreground">-</span>;

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
      Download
    </Button>
  );
}

function GenerateCell({ report }: { report: ReportRequest }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => reportService.generateReport(report),
    onSuccess: (result) => {
      if (result.status === 'Ready') {
        toast.success('Report generated.');
        if (result.emailTo) {
          if (result.emailError) toast.error(`Report is ready, but the email failed to send: ${result.emailError}`);
          else toast.success(`Emailed to ${result.emailTo}.`);
        }
      } else {
        toast.error('Report generation failed.');
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to generate report'),
    // Always resync from the DB, even on error - generation can partially
    // succeed (e.g. the file uploads and the row is marked Ready, but the
    // email step throws) and the UI shouldn't need a manual refresh to see it.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['report-requests'] }),
  });

  if (report.status !== 'Pending') return null;

  return (
    <Button size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      Generate
    </Button>
  );
}

function buildColumns(isAdmin: boolean): ColumnDef<ReportRequest>[] {
  const cols: ColumnDef<ReportRequest>[] = [
    { accessorKey: 'machineName', header: 'Machine', cell: ({ row }) => row.original.machineName || 'All machines' },
    { accessorKey: 'reportType', header: 'Type' },
    { accessorKey: 'dataSelection', header: 'Data' },
    {
      accessorKey: 'reportFrom',
      header: 'Range',
      cell: ({ row }) => `${formatDateTime(row.original.reportFrom)} – ${formatDateTime(row.original.reportTo)}`,
    },
    { accessorKey: 'remarks', header: 'Remarks', cell: ({ row }) => row.original.remarks || '-' },
    { accessorKey: 'emailTo', header: 'Send To', cell: ({ row }) => row.original.emailTo || '-' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge> },
    { accessorKey: 'requestedAt', header: 'Requested', cell: ({ row }) => formatDateTime(row.original.requestedAt) },
  ];

  // Only an admin can turn a Pending request into an actual file - a
  // customer's own request just waits here for admin review, it never gets
  // a direct download/generate action of its own.
  if (isAdmin) {
    cols.push({ id: 'generate', header: 'Generate', enableSorting: false, cell: ({ row }) => <GenerateCell report={row.original} /> });
  }
  cols.push({ id: 'download', header: 'File', enableSorting: false, cell: ({ row }) => <DownloadCell report={row.original} /> });

  return cols;
}

export function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = !user?.customerId;
  const [machineId, setMachineId] = useState('');
  const [reportType, setReportType] = useState<ReportFileType>('PDF');
  const [dataSelection, setDataSelection] = useState<DataSelectionMode>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [remarks, setRemarks] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.email) setEmailTo(user.email);
  }, [user?.email]);

  const requestsQuery = useQuery({ queryKey: ['report-requests'], queryFn: reportService.getReportRequests });
  const machineQuery = useQuery({ queryKey: ['machine', machineId], queryFn: () => machineService.getMachine(machineId), enabled: !!machineId });

  const mutation = useMutation({
    mutationFn: () => {
      if (!machineQuery.data) throw new Error('Select a machine first');
      if (new Date(to).getTime() <= new Date(from).getTime()) throw new Error('"To" must be after "From"');
      return reportService.createReportRequest({
        machineId,
        customerId: machineQuery.data.customerId,
        reportType,
        dataSelection,
        reportFrom: new Date(from).toISOString(),
        reportTo: new Date(to).toISOString(),
        emailTo: emailTo.trim(),
        remarks: remarks.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-requests'] });
      toast.success(isAdmin ? 'Report queued — use Generate below when ready.' : 'Report requested — an admin will review and generate it.');
      setRemarks('');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to request report'),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Request and track machine data reports." />

      <Card>
        <CardHeader>
          <CardTitle>Request Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Machine</Label>
              <MachineSelect value={machineId} onChange={setMachineId} />
            </div>
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportFileType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Selection</Label>
              <Select value={dataSelection} onValueChange={(v) => setDataSelection(v as DataSelectionMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SELECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            All sends every reading. High/Low/Median each keep ~half of every hour's readings per sensor (the top half, bottom half, or centered
            "typical" band) - applied independently per sensor, so PDF/CSV/Excel switch to one section/sheet per sensor when active.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Send To Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="you@example.com" className="pl-9" />
              </div>
              <p className="text-xs text-muted-foreground">The finished report is emailed here once it's generated.</p>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Anything the admin should know about this request..."
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!machineQuery.data || !from || !to || !emailTo.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isAdmin ? 'Queue Report' : 'Request Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={buildColumns(isAdmin)}
            data={requestsQuery.data ?? []}
            isLoading={requestsQuery.isLoading}
            isError={requestsQuery.isError}
            onRetry={() => requestsQuery.refetch()}
            emptyTitle="No reports yet"
            emptyDescription="Request your first report using the form above."
          />
        </CardContent>
      </Card>
    </div>
  );
}
