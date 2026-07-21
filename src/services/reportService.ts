import reportsData from '@/mock/reports.json';
import devicesData from '@/mock/devices.json';
import type { Device, GenerateReportInput, GeneratedReport } from '@/types';
import { wait } from '@/utils/latency';
import { generateId } from '@/utils/id';
import { appConfig } from '@/config/config';

let reports: GeneratedReport[] = JSON.parse(JSON.stringify(reportsData)) as GeneratedReport[];
const devices = devicesData as Device[];

export const reportService = {
  async getReports(): Promise<GeneratedReport[]> {
    await wait();
    return [...reports].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  },

  async generateReport(input: GenerateReportInput, generatedBy = 'Admin'): Promise<GeneratedReport> {
    await wait(appConfig.mockLatency.slow);
    const deviceScope =
      input.deviceIds.length === 0
        ? 'All Devices'
        : input.deviceIds.length === 1
        ? devices.find((d) => d.id === input.deviceIds[0])?.name ?? input.deviceIds[0]
        : `${input.deviceIds.length} Devices`;
    const newReport: GeneratedReport = {
      id: generateId('RPT'),
      name: `${input.type} Report - ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      type: input.type,
      deviceScope,
      deviceIds: input.deviceIds,
      format: input.format,
      generatedAt: new Date().toISOString(),
      generatedBy,
      sizeKb: Math.floor(Math.random() * 1800) + 120,
      status: 'Ready',
    };
    reports = [newReport, ...reports];
    return newReport;
  },

  async deleteReport(id: string): Promise<void> {
    await wait();
    reports = reports.filter((r) => r.id !== id);
  },
};
