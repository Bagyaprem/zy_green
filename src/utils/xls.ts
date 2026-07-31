/**
 * Builds a real, Excel-openable spreadsheet using the SpreadsheetML 2003 XML
 * format — a plain-text single-file format Excel/LibreOffice/Google Sheets
 * all open natively, with no ZIP/binary structure and no extra dependency
 * (unlike the .xlsx OOXML format, which needs a library like SheetJS).
 */
function escapeXml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sheetXml(sheetName: string, rows: Record<string, string | number>[]): string {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const cell = (v: string | number) => {
    const isNumber = typeof v === 'number' && Number.isFinite(v);
    const type = isNumber ? 'Number' : 'String';
    return `<Cell><Data ss:Type="${type}">${escapeXml(String(v ?? ''))}</Data></Cell>`;
  };
  const headerRow = `<Row>${headers.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows.map((row) => `<Row>${headers.map((h) => cell(row[h])).join('')}</Row>`).join('');
  // Sheet names in this format have a strict 31-char limit and can't contain []:*?/\
  const safeName = escapeXml(sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31));

  return `<Worksheet ss:Name="${safeName}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
}

export function rowsToXls(sheetName: string, rows: Record<string, string | number>[]): string {
  return rowsToXlsMultiSheet([{ name: sheetName, rows }]);
}

/** Same SpreadsheetML format as rowsToXls, but with one workbook holding multiple named sheets. */
export function rowsToXlsMultiSheet(sheets: { name: string; rows: Record<string, string | number>[] }[]): string {
  const worksheets = sheets.map((s) => sheetXml(s.name, s.rows)).join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 ${worksheets}
</Workbook>`;
}

/** Builds a Blob for a single-sheet SpreadsheetML document, ready to upload or download as .xls. */
export function buildXlsBlob(sheetName: string, rows: Record<string, string | number>[]): Blob {
  return new Blob([rowsToXls(sheetName, rows)], { type: 'application/vnd.ms-excel' });
}

/** Builds a Blob for a multi-sheet SpreadsheetML workbook (one tab per entry). */
export function buildMultiSheetXlsBlob(sheets: { name: string; rows: Record<string, string | number>[] }[]): Blob {
  return new Blob([rowsToXlsMultiSheet(sheets)], { type: 'application/vnd.ms-excel' });
}
