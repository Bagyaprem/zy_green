import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { appConfig } from '@/config/config';

/** Generates and downloads a simple tabular PDF report from an array of flat objects. */
export function exportToPdf(filename: string, title: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const doc = new jsPDF({ orientation: 'landscape' });
  const headers = Object.keys(rows[0]);

  doc.setFontSize(14);
  doc.setTextColor(46, 125, 50); // primary green
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(`${appConfig.appName} · Generated ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map((row) => headers.map((h) => String(row[h] ?? ''))),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [14, 47, 36], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
