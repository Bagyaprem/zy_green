import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { deviceService } from '@/services/deviceService';
import { reportService } from '@/services/reportService';
import { REPORT_TYPE_OPTIONS } from '@/constants/options';
import { formatBytes, formatDateTime } from '@/utils/format';
import { exportToCsv } from '@/utils/csv';
import type { GeneratedReport, ReportType } from '@/types';

export function ReportsPage() {
  const [type, setType] = useState<ReportType>('Daily');
  const [deviceId, setDeviceId] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const queryClient = useQueryClient();

  const devicesQuery = useQuery({ queryKey: ['devices-lite'], queryFn: () => deviceService.getDevices() });
  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: reportService.getReports });

  const generateMutation = useMutation({
    mutationFn: reportService.generateReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generated successfully');
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      type,
      deviceIds: deviceId === 'all' ? [] : [deviceId],
      from: date,
      to: date,
      format: 'PDF',
    });
  };

  const handleDownload = (report: GeneratedReport) => {
    exportToCsv(report.name, [
      { Report: report.name, Type: report.type, Scope: report.deviceScope, Generated: formatDateTime(report.generatedAt), By: report.generatedBy },
    ]);
    toast.success('Report downloaded');
  };

  const columns: ColumnDef<GeneratedReport>[] = [
    { accessorKey: 'name', header: 'Report Name' },
    { accessorKey: 'deviceScope', header: 'Device(s)' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'generatedAt', header: 'Date', cell: ({ row }) => formatDateTime(row.original.generatedAt) },
    { accessorKey: 'sizeKb', header: 'Size', cell: ({ row }) => formatBytes(row.original.sizeKb) },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'Ready' ? 'success' : row.original.status === 'Failed' ? 'danger' : 'warning'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Download',
      enableSorting: false,
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={row.original.status !== 'Ready'} onClick={() => handleDownload(row.original)}>
          <Download className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Generate and download historical reports for your device fleet." />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Report Type</label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Device</label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devicesQuery.data?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-9 w-[160px] rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
            />
          </div>
          <Button className="ml-auto" onClick={handleGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={reportsQuery.data ?? []}
            isLoading={reportsQuery.isLoading}
            isError={reportsQuery.isError}
            onRetry={() => reportsQuery.refetch()}
            emptyTitle="No reports generated yet"
            emptyDescription="Generate your first report using the form above."
          />
        </CardContent>
      </Card>
    </div>
  );
}
