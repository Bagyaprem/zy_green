/** Builds a CSV string from an array of flat objects. Shared by the browser-download export and the server-side report generator. */
export function rowsToCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    let s = String(v ?? '');
    // Formula-injection guard: a cell starting with =, +, -, or @ gets executed as a
    // formula when the file is opened in Excel/Sheets. Prefixing with a tab neutralizes
    // it while keeping the value visually intact.
    if (/^[=+\-@]/.test(s)) s = `\t${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];
  return lines.join('\n');
}

/** Triggers a browser download of a CSV built from an array of flat objects. No server-side file generation involved — this is real, immediate, and works offline. */
export function exportToCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
