// Monthly per-CUSTOMER data export, emailed as an Excel workbook.
//
// Triggered by a pg_cron schedule (see supabase_monthly_reports_cron.sql).
// Each customer receives one workbook covering the previous calendar month,
// with one sheet per machine they own; the admin list is bcc'd on every send
// so there's a complete archive without exposing admin addresses to
// customers.
//
// Deliberately a spreadsheet, not the branded PDF the web app produces:
// that generator (reportService.ts -> chartToImage.tsx) mounts a React tree
// into the DOM and rasterizes it with html2canvas, and uses `new Image()`.
// None of that exists in Deno, so it cannot run on a schedule. SpreadsheetML
// 2003 is plain text XML that Excel/LibreOffice/Sheets all open natively -
// no ZIP container, no dependency - so it ports here cleanly.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ADMIN_EMAILS = ['prembagya822@gmail.com'];

// Reports are scheduled for 00:00 IST on the 1st. pg_cron runs in UTC, and
// IST has no DST, so the cron fires daily at 18:30 UTC (= 00:00 IST) and
// this guard decides whether today is actually the 1st *in IST*. Doing the
// month arithmetic in UTC would be wrong: at 18:30 UTC on 31 Aug it is
// already 1 Sep in IST, so "previous month" must resolve to August, not July.
const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+05:30

function istNow(): Date {
  // A Date whose UTC fields read as IST wall-clock time.
  return new Date(Date.now() + IST_OFFSET_MS);
}

/** Previous calendar month in IST, returned as real UTC instants for querying. */
function previousMonthRange(): { from: string; to: string; label: string } {
  const ist = istNow();
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  // IST-midnight boundaries, shifted back to the equivalent UTC instant.
  const from = new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS);
  const to = new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return { from: from.toISOString(), to: to.toISOString(), label };
}

// ── SpreadsheetML (ported from src/utils/xls.ts; keep the two in sync) ──────
function escapeXml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sheetXml(sheetName: string, rows: Record<string, string | number | null>[]): string {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const cell = (v: string | number | null) => {
    const isNumber = typeof v === 'number' && Number.isFinite(v);
    return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(String(v ?? ''))}</Data></Cell>`;
  };
  const headerRow = `<Row>${headers.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows.map((row) => `<Row>${headers.map((h) => cell(row[h])).join('')}</Row>`).join('');
  // Sheet names: 31-char cap, and []:*?/\ are illegal.
  const safeName = escapeXml(sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31));
  return `<Worksheet ss:Name="${safeName}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
}

function buildWorkbook(sheets: { name: string; rows: Record<string, string | number | null>[] }[]): string {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 ${sheets.map((s) => sheetXml(s.name, s.rows)).join('')}
</Workbook>`;
}

/** UTF-8 safe base64 — btoa alone mangles any non-ASCII byte. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

interface MachineRow {
  id: string;
  machine_code: string;
  machine_name: string;
  customer_id: string | null;
  customers: { customer_name: string; email: string | null } | null;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // `force` lets you test on any day without waiting for the 1st.
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const ist = istNow();
    if (!force && ist.getUTCDate() !== 1) {
      return new Response(
        JSON.stringify({ ok: true, skipped: `Not the 1st in IST (currently ${ist.toISOString().slice(0, 10)} IST). Pass {"force":true} to run anyway.` }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { from, to, label } = previousMonthRange();

    const { data: machines, error: machinesError } = await supabase
      .from('machines')
      .select('id, machine_code, machine_name, customer_id, customers(customer_name, email)')
      .order('machine_code');
    if (machinesError) throw machinesError;

    // Group machines by owning customer — one workbook per customer.
    const byCustomer = new Map<string, { name: string; email: string | null; machines: MachineRow[] }>();
    for (const raw of (machines ?? []) as unknown as MachineRow[]) {
      if (!raw.customer_id) continue; // unassigned machine — no one to send to
      const customer = Array.isArray(raw.customers) ? raw.customers[0] : raw.customers;
      const entry = byCustomer.get(raw.customer_id) ?? {
        name: customer?.customer_name ?? 'Customer',
        email: customer?.email ?? null,
        machines: [],
      };
      entry.machines.push(raw);
      byCustomer.set(raw.customer_id, entry);
    }

    const sent: string[] = [];
    const skipped: string[] = [];
    const errors: { customer: string; error: string }[] = [];

    for (const [, customer] of byCustomer) {
      if (!customer.email) {
        skipped.push(`${customer.name} (no email on file)`);
        continue;
      }

      // One sheet per machine, ordered as fetched.
      const sheets: { name: string; rows: Record<string, string | number | null>[] }[] = [];
      let totalRows = 0;

      for (const machine of customer.machines) {
        const { data: rows, error: rowsError } = await supabase
          .from('sensor_data')
          .select('recorded_at, pm1_0, pm2_5, pm4_0, pm10, co2, temperature, humidity')
          .eq('machine_id', machine.id)
          .gte('recorded_at', from)
          .lt('recorded_at', to)
          .order('recorded_at', { ascending: true });

        if (rowsError) {
          errors.push({ customer: customer.name, error: `${machine.machine_code}: ${rowsError.message}` });
          continue;
        }
        if (!rows?.length) continue;

        totalRows += rows.length;
        sheets.push({ name: `${machine.machine_code}`, rows });
      }

      if (!sheets.length) {
        skipped.push(`${customer.name} (no readings in ${label})`);
        continue;
      }

      const workbook = buildWorkbook(sheets);
      const fileName = `ZYGREEN-${customer.name.replace(/[^a-zA-Z0-9]+/g, '-')}-${label.replace(' ', '-')}.xls`;

      const machineList = customer.machines.map((m) => `${m.machine_code} (${m.machine_name})`).join(', ');
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ZYGREEN Reports <onboarding@resend.dev>',
          to: [customer.email],
          bcc: ADMIN_EMAILS, // admin archive, without exposing those addresses
          subject: `ZYGREEN monthly air quality report — ${label}`,
          html: `<p>Hello ${escapeXml(customer.name)},</p>
            <p>Attached is your air quality data for <strong>${label}</strong> — ${totalRows.toLocaleString()} readings
            across ${sheets.length} machine${sheets.length === 1 ? '' : 's'}, one sheet per machine.</p>
            <p>Machines included: ${escapeXml(machineList)}</p>
            <p>— ZYGREEN</p>`,
          attachments: [{ filename: fileName, content: toBase64(workbook) }],
        }),
      });

      if (!resendResp.ok) {
        errors.push({ customer: customer.name, error: JSON.stringify(await resendResp.json()) });
        continue;
      }
      sent.push(`${customer.name} <${customer.email}>`);
    }

    return new Response(JSON.stringify({ ok: true, period: label, sent, skipped, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
