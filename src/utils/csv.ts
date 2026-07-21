/** Builds and downloads a CSV file from an array of flat objects, client-side only. */
export function exportToCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Simulates a PDF export by downloading a lightweight text summary (no PDF lib dependency). */
export function exportToPdfPlaceholder(filename: string, title: string, rows: Record<string, unknown>[]): void {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const lines = [
    title,
    '='.repeat(title.length),
    '',
    headers.join(' | '),
    ...rows.map((row) => headers.map((h) => String(row[h] ?? '')).join(' | ')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
