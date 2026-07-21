import { supabase, assertSupabaseConfigured } from './supabaseClient';
import type { GenerateReportInput, GeneratedReport } from '@/types';
import { generateId } from '@/utils/id';

interface ReportRow {
  id: string;
  name: string;
  type: GeneratedReport['type'];
  device_scope: string | null;
  device_ids: string[] | null;
  format: GeneratedReport['format'];
  generated_at: string;
  generated_by: string | null;
  size_kb: number | null;
  status: GeneratedReport['status'];
}

function mapReport(row: ReportRow): GeneratedReport {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    deviceScope: row.device_scope ?? 'All Devices',
    deviceIds: row.device_ids ?? [],
    format: row.format,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by ?? '',
    sizeKb: row.size_kb ?? 0,
    status: row.status,
  };
}

export const reportService = {
  async getReports(): Promise<GeneratedReport[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('generated_reports').select('*').order('generated_at', { ascending: false });
    if (error) throw error;
    return (data as ReportRow[]).map(mapReport);
  },

  /**
   * Real report generation (aggregating readings into a downloadable
   * PDF/CSV) is a server-side job — this inserts a 'Generating' row and
   * kicks off a Supabase Edge Function that would flip it to 'Ready' (with
   * a Storage file_path) once the job completes. No report content is
   * fabricated client-side.
   */
  async generateReport(input: GenerateReportInput, generatedBy = 'Admin'): Promise<GeneratedReport> {
    assertSupabaseConfigured();
    let deviceScope = 'All Devices';
    if (input.deviceIds.length === 1) {
      const { data: device } = await supabase.from('devices').select('name').eq('id', input.deviceIds[0]).maybeSingle();
      deviceScope = device?.name ?? input.deviceIds[0];
    } else if (input.deviceIds.length > 1) {
      deviceScope = `${input.deviceIds.length} Devices`;
    }

    const id = generateId('RPT');
    const { data, error } = await supabase
      .from('generated_reports')
      .insert({
        id,
        name: `${input.type} Report - ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        type: input.type,
        device_scope: deviceScope,
        device_ids: input.deviceIds,
        format: input.format,
        generated_by: generatedBy,
        status: 'Generating',
      })
      .select('*')
      .single();
    if (error) throw error;

    // Fire-and-forget the async generation job; ignore failures here since
    // the row already reflects 'Generating' and a future refetch/subscription
    // will pick up the real status once the Edge Function updates it.
    void supabase.functions.invoke('generate-report', { body: { reportId: id } });

    return mapReport(data as ReportRow);
  },

  async deleteReport(id: string): Promise<void> {
    assertSupabaseConfigured();
    const { error } = await supabase.from('generated_reports').delete().eq('id', id);
    if (error) throw error;
  },
};
