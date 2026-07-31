export type ReportFileType = 'PDF' | 'CSV' | 'Excel';
export type ReportRequestStatus = 'Pending' | 'Generating' | 'Ready' | 'Failed';
/**
 * How many of each hour's ~720 readings to include, per sensor independently:
 * All = every reading; High/Low = the top/bottom half by value that hour;
 * Median = the centered half (trims equally off both extremes).
 */
export type DataSelectionMode = 'All' | 'High' | 'Low' | 'Median';

export interface ReportRequest {
  id: string;
  machineId: string | null;
  machineName: string | null;
  customerId: string | null;
  customerName: string | null;
  reportType: ReportFileType;
  dataSelection: DataSelectionMode;
  reportFrom: string;
  reportTo: string;
  status: ReportRequestStatus;
  requestedAt: string;
  emailTo: string | null;
  remarks: string | null;
  fileName: string | null;
  fileUrl: string | null;
}

export interface CreateReportRequestInput {
  machineId: string | null;
  customerId: string | null;
  reportType: ReportFileType;
  dataSelection: DataSelectionMode;
  reportFrom: string;
  reportTo: string;
  emailTo?: string;
  remarks?: string;
}
