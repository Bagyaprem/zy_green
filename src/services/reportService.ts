import jsPDF, { GState } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, assertSupabaseConfigured } from './supabaseClient';
import { sensorService } from './sensorService';
import { rowsToCsv } from '@/utils/csv';
import { buildXlsBlob, buildMultiSheetXlsBlob } from '@/utils/xls';
import { renderSensorChartPng } from '@/utils/chartToImage';
import { loadImage } from '@/utils/loadImage';
import { filterByHourlyBand } from '@/utils/hourlyBand';
import { SENSOR_META } from '@/constants/sensorMeta';
import type { CreateReportRequestInput, ReportRequest, ReportFileType, DataSelectionMode } from '@/types';
import type { SensorReading } from '@/types';

const REPORTS_BUCKET = 'reports';

// AQI is a computed composite index, not a physical sensor - excluded from
// the High/Low/Median per-sensor filtering (and always null today anyway).
// "All" mode still includes it in the combined table/chart, unaffected.
const RAW_SENSOR_META = SENSOR_META.filter((m) => m.key !== 'AQI');

interface ReportRow {
  id: string;
  machine_id: string | null;
  customer_id: string | null;
  report_type: ReportRequest['reportType'];
  data_selection: ReportRequest['dataSelection'];
  report_from: string;
  report_to: string;
  status: ReportRequest['status'];
  requested_at: string;
  email_to: string | null;
  remarks: string | null;
  machines: { machine_name: string } | null;
  customers: { customer_name: string } | null;
  machine_reports: { file_name: string; file_url: string | null }[] | null;
}

function mapReport(row: ReportRow): ReportRequest {
  const generated = row.machine_reports?.[0] ?? null;
  return {
    id: row.id,
    machineId: row.machine_id,
    machineName: row.machines?.machine_name ?? null,
    customerId: row.customer_id,
    customerName: row.customers?.customer_name ?? null,
    reportType: row.report_type,
    dataSelection: row.data_selection ?? 'All',
    reportFrom: row.report_from,
    reportTo: row.report_to,
    status: row.status,
    requestedAt: row.requested_at,
    emailTo: row.email_to,
    remarks: row.remarks,
    fileName: generated?.file_name ?? null,
    fileUrl: generated?.file_url ?? null,
  };
}

const REPORT_SELECT = '*, machines(machine_name), customers(customer_name), machine_reports(file_name, file_url)';

const PAGE_MARGIN = 14;
const BRAND_COLOR: [number, number, number] = [14, 47, 36];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];

function subtitleLine(request: ReportRequest): string {
  const range = `${new Date(request.reportFrom).toLocaleDateString()} - ${new Date(request.reportTo).toLocaleDateString()}`;
  return `${request.machineName ?? 'Unknown machine'} · ${request.customerName ?? '-'} · ${range}`;
}

/** Builds a PDF of the machine's sensor readings for the report's date range. */
async function buildReportPdf(request: ReportRequest): Promise<Blob> {
  if (!request.machineId) throw new Error('Report has no machine assigned');
  const rows = await sensorService.getHistory(request.machineId, request.reportFrom, request.reportTo);
  const logo = await loadImage('/logo.png');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const centerX = pageWidth / 2;

  const logoSize = 16;
  doc.addImage(logo, 'PNG', centerX - logoSize / 2, 10, logoSize, logoSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(20);
  doc.text('ZYGREEN', centerX, 34, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text('Sensor Report', centerX, 41, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Machine: ${request.machineName ?? '-'}`, PAGE_MARGIN, 51);
  doc.text(`Customer: ${request.customerName ?? '-'}`, PAGE_MARGIN, 57);
  doc.text(`Range: ${new Date(request.reportFrom).toLocaleString()} - ${new Date(request.reportTo).toLocaleString()}`, PAGE_MARGIN, 63);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_MARGIN, 69);
  let y = 69;
  if (request.dataSelection !== 'All') {
    y += 6;
    doc.text(`Data Selection: ${request.dataSelection} (each hour's ~50% ${request.dataSelection.toLowerCase()} readings, per sensor)`, PAGE_MARGIN, y);
  }
  if (request.remarks) {
    y += 6;
    doc.text(`Remarks: ${request.remarks}`, PAGE_MARGIN, y);
  }
  const tableStartY = y + 12;
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(PAGE_MARGIN, tableStartY - 6, pageWidth - PAGE_MARGIN, tableStartY - 6);

  if (request.dataSelection === 'All') {
    autoTable(doc, {
      startY: tableStartY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Time', 'CO2 (ppm)', 'PM1.0', 'PM2.5', 'PM4.0', 'PM10', 'Temp (°C)', 'Humidity (%)']],
      body: rows.map((r) => [
        new Date(r.recordedAt).toLocaleString(),
        r.co2 ?? '-',
        r.pm1_0 ?? '-',
        r.pm2_5 ?? '-',
        r.pm4_0 ?? '-',
        r.pm10 ?? '-',
        r.temperature ?? '-',
        r.humidity ?? '-',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: BRAND_COLOR },
    });

    if (rows.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('No sensor readings were recorded in this date range.', PAGE_MARGIN, tableStartY + 8);
    }
  } else {
    // A combined raw table doesn't make sense once every sensor keeps a
    // different, independently-filtered subset of timestamps (see
    // addSensorChartPages) - a compact per-sensor summary replaces it.
    autoTable(doc, {
      startY: tableStartY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      head: [['Sensor', 'Unit', 'Readings Kept', 'Readings Total', '% Kept']],
      body: RAW_SENSOR_META.map((meta) => {
        const total = rows.filter((r) => r[meta.field] != null).length;
        const kept = filterByHourlyBand(
          rows.map((r) => ({ recordedAt: r.recordedAt, value: r[meta.field] })).filter((p): p is { recordedAt: string; value: number } => p.value != null),
          request.dataSelection
        ).length;
        return [meta.label, meta.unit, kept, total, total > 0 ? `${Math.round((kept / total) * 100)}%` : '-'];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: BRAND_COLOR },
    });
  }

  await addSensorChartPages(doc, rows, request, contentWidth);
  addWatermarks(doc, logo);
  addPageFooters(doc, request);

  return doc.output('blob');
}

/** Faint, centered company-logo watermark stamped on every page (drawn last, on top, at low opacity - the standard document-watermark approach, since jsPDF has no z-order/layers to place it "behind" earlier content). */
function addWatermarks(doc: jsPDF, logo: HTMLImageElement): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const size = Math.min(pageWidth, pageHeight) * 0.55;
  const x = (pageWidth - size) / 2;
  const y = (pageHeight - size) / 2;
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.06 }));
    doc.addImage(logo, 'PNG', x, y, size, size);
    doc.restoreGraphicsState();
  }
}

/**
 * One page per sensor parameter that has at least one non-null reading in
 * range, each with a trend chart in a bordered card, laid out on the same
 * margins/typography as the summary page for visual consistency.
 */
async function addSensorChartPages(doc: jsPDF, rows: SensorReading[], request: ReportRequest, contentWidth: number): Promise<void> {
  const imgHeight = contentWidth / (720 / 300); // matches the chart's fixed pixel aspect ratio
  const cardPadding = 4;
  const mode = request.dataSelection;
  const sensors = mode === 'All' ? SENSOR_META : RAW_SENSOR_META;

  for (const meta of sensors) {
    const rawPoints = rows
      .map((r) => ({ recordedAt: r.recordedAt, value: r[meta.field] }))
      .filter((p): p is { recordedAt: string; value: number } => p.value != null);
    const points = filterByHourlyBand(rawPoints, mode);
    if (!points.length) continue;

    const png = await renderSensorChartPng(points, meta);
    if (!png) continue;

    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.text(`${meta.label} (${meta.unit})`, PAGE_MARGIN, 20);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      mode === 'All' ? subtitleLine(request) : `${subtitleLine(request)} · ${mode}: ${points.length} of ${rawPoints.length} readings`,
      PAGE_MARGIN,
      26
    );

    const cardY = 34;
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.roundedRect(PAGE_MARGIN - cardPadding, cardY - cardPadding, contentWidth + cardPadding * 2, imgHeight + cardPadding * 2, 2, 2, 'S');
    doc.addImage(png, 'PNG', PAGE_MARGIN, cardY, contentWidth, imgHeight);
  }
}

/** Consistent footer (report identity + page numbers) stamped on every page after all content is in. */
function addPageFooters(doc: jsPDF, request: ReportRequest): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(PAGE_MARGIN, pageHeight - 14, pageWidth - PAGE_MARGIN, pageHeight - 14);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`ZYGREEN · ${request.machineName ?? 'Sensor Report'}`, PAGE_MARGIN, pageHeight - 9);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 9, { align: 'right' });
  }
}

function sensorRowsToRecords(rows: SensorReading[]): Record<string, string | number>[] {
  return rows.map((r) => ({
    recorded_at: new Date(r.recordedAt).toLocaleString(),
    aqi: r.aqi ?? '',
    co2: r.co2 ?? '',
    temperature: r.temperature ?? '',
    humidity: r.humidity ?? '',
    pm1_0: r.pm1_0 ?? '',
    pm2_5: r.pm2_5 ?? '',
    pm4_0: r.pm4_0 ?? '',
    pm10: r.pm10 ?? '',
  }));
}

/**
 * Per sensor (excluding AQI - see RAW_SENSOR_META), applies the hourly
 * High/Low/Median filter independently and returns { sensor, unit, records }
 * groups - each sensor keeps its own subset of timestamps, which is why this
 * can't stay one shared table of rows once a filter mode is active.
 */
function filteredSensorGroups(rows: SensorReading[], mode: DataSelectionMode) {
  return RAW_SENSOR_META.map((meta) => {
    const rawPoints = rows.map((r) => ({ recordedAt: r.recordedAt, value: r[meta.field] })).filter((p): p is { recordedAt: string; value: number } => p.value != null);
    const points = filterByHourlyBand(rawPoints, mode);
    return { sensor: meta.label, unit: meta.unit, points };
  });
}

/** Builds a CSV of the machine's sensor readings for the report's date range. */
async function buildReportCsv(request: ReportRequest): Promise<Blob> {
  if (!request.machineId) throw new Error('Report has no machine assigned');
  const rows = await sensorService.getHistory(request.machineId, request.reportFrom, request.reportTo);

  if (request.dataSelection === 'All') {
    return new Blob([rowsToCsv(sensorRowsToRecords(rows))], { type: 'text/csv;charset=utf-8;' });
  }

  // Long/tidy format (recorded_at, sensor, value) instead of one wide row per
  // timestamp, since each sensor now keeps a different, independently
  // filtered set of timestamps and can no longer share one row grid.
  const records = filteredSensorGroups(rows, request.dataSelection).flatMap((group) =>
    group.points.map((p) => ({
      recorded_at: new Date(p.recordedAt).toLocaleString(),
      sensor: group.sensor,
      unit: group.unit,
      value: p.value,
    }))
  );
  return new Blob([rowsToCsv(records)], { type: 'text/csv;charset=utf-8;' });
}

/** Builds an Excel-openable spreadsheet (SpreadsheetML) of the machine's sensor readings for the report's date range. */
async function buildReportExcel(request: ReportRequest): Promise<Blob> {
  if (!request.machineId) throw new Error('Report has no machine assigned');
  const rows = await sensorService.getHistory(request.machineId, request.reportFrom, request.reportTo);

  if (request.dataSelection === 'All') {
    return buildXlsBlob('Sensor Report', sensorRowsToRecords(rows));
  }

  // One sheet per sensor, since each keeps a different filtered timestamp set.
  const sheets = filteredSensorGroups(rows, request.dataSelection).map((group) => ({
    name: group.sensor,
    rows: group.points.map((p) => ({ recorded_at: new Date(p.recordedAt).toLocaleString(), value: p.value })),
  }));
  return buildMultiSheetXlsBlob(sheets);
}

const REPORT_FILE_SPEC: Record<ReportFileType, { ext: string; contentType: string; build: (r: ReportRequest) => Promise<Blob> }> = {
  PDF: { ext: 'pdf', contentType: 'application/pdf', build: buildReportPdf },
  CSV: { ext: 'csv', contentType: 'text/csv;charset=utf-8;', build: buildReportCsv },
  Excel: { ext: 'xls', contentType: 'application/vnd.ms-excel', build: buildReportExcel },
};

/**
 * Generates the report file and uploads it to Storage, then marks the
 * request Ready (or Failed, if generation/upload throws). PDF, CSV, and
 * Excel are all implemented via REPORT_FILE_SPEC above.
 *
 * Only ever called explicitly by an admin action (reportService.generateReport)
 * - a customer's own request never auto-generates. Customers request; admins
 * review and generate. See ReportsPage for the role-gated "Generate" button.
 */
async function generateAndAttach(request: ReportRequest): Promise<void> {
  if (!request.customerId) throw new Error('Report has no customer assigned');
  const spec = REPORT_FILE_SPEC[request.reportType];

  try {
    const blob = await spec.build(request);
    const path = `${request.customerId}/${request.id}.${spec.ext}`;

    const { error: uploadError } = await supabase.storage.from(REPORTS_BUCKET).upload(path, blob, {
      contentType: spec.contentType,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const fileName = `sensor-report-${request.reportFrom.slice(0, 10)}-to-${request.reportTo.slice(0, 10)}.${spec.ext}`;
    const { error: reportInsertError } = await supabase
      .from('machine_reports')
      .insert({ request_id: request.id, file_name: fileName, file_url: path, emailed_to: request.emailTo });
    if (reportInsertError) throw reportInsertError;

    const { error: statusError } = await supabase.from('report_requests').update({ status: 'Ready' }).eq('id', request.id);
    if (statusError) throw statusError;
  } catch (err) {
    await supabase.from('report_requests').update({ status: 'Failed' }).eq('id', request.id);
    throw err;
  }
}

/**
 * Fires the send-report-email Edge Function. Best-effort: a delivery
 * failure here must never undo an otherwise-successful report generation.
 * Wrapped in try/catch (not just checking the returned `error`) because
 * `functions.invoke` can itself throw (e.g. the function isn't deployed, a
 * network error) rather than resolving with `{ error }` - an uncaught throw
 * here would previously make the whole `generateReport` call reject even
 * though the file had already uploaded and the request was already marked
 * Ready, producing a false "failed" toast that only cleared on a manual page
 * refresh once react-query's cache eventually revalidated.
 */
async function sendReportEmail(requestId: string): Promise<string | null> {
  try {
    const { error } = await supabase.functions.invoke('send-report-email', { body: { requestId } });
    return error ? (error.message ?? 'Email delivery failed') : null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Email delivery failed';
  }
}

export const reportService = {
  async getReportRequests(): Promise<ReportRequest[]> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.from('report_requests').select(REPORT_SELECT).order('requested_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as ReportRow[]).map(mapReport);
  },

  /**
   * Queues the request only - never auto-generates. A customer's request
   * waits here as "Pending" for an admin to review and generate via
   * reportService.generateReport.
   */
  async createReportRequest(input: CreateReportRequestInput): Promise<ReportRequest> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('report_requests')
      .insert({
        machine_id: input.machineId,
        customer_id: input.customerId,
        report_type: input.reportType,
        data_selection: input.dataSelection,
        report_from: input.reportFrom,
        report_to: input.reportTo,
        email_to: input.emailTo || null,
        remarks: input.remarks || null,
        status: 'Pending',
      })
      .select(REPORT_SELECT)
      .single();
    if (error) throw error;
    return mapReport(data as unknown as ReportRow);
  },

  /**
   * Admin-only action: generates the file for a Pending request (PDF, CSV,
   * or Excel), uploads it, marks the request Ready/Failed, and emails it if
   * an address was given. There's no server-side job queue, so this happens
   * synchronously in the same call - the caller should show a loading state.
   *
   * emailError is set (not thrown) if generation succeeded but delivery
   * didn't - the caller can surface that separately from the main result.
   */
  async generateReport(request: ReportRequest): Promise<ReportRequest & { emailError?: string | null }> {
    assertSupabaseConfigured();
    await generateAndAttach(request);

    const { data: finalData, error: refetchError } = await supabase.from('report_requests').select(REPORT_SELECT).eq('id', request.id).single();
    if (refetchError) throw refetchError;
    const finalRequest = mapReport(finalData as unknown as ReportRow);

    let emailError: string | null = null;
    if (finalRequest.status === 'Ready' && finalRequest.emailTo) {
      emailError = await sendReportEmail(finalRequest.id);
    }

    return { ...finalRequest, emailError };
  },

  /** Resolves a stored Storage path into a short-lived signed URL for downloading. */
  async getDownloadUrl(path: string): Promise<string> {
    assertSupabaseConfigured();
    const { data, error } = await supabase.storage.from(REPORTS_BUCKET).createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  },
};
