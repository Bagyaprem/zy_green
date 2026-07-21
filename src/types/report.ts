export type ReportType = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type ReportFormat = 'PDF' | 'CSV';

export interface GeneratedReport {
  id: string;
  name: string;
  type: ReportType;
  deviceScope: string; // "All Devices" or device name(s)
  deviceIds: string[];
  format: ReportFormat;
  generatedAt: string;
  generatedBy: string;
  sizeKb: number;
  status: 'Ready' | 'Generating' | 'Failed';
}

export interface GenerateReportInput {
  type: ReportType;
  deviceIds: string[];
  from?: string;
  to?: string;
  format: ReportFormat;
}
