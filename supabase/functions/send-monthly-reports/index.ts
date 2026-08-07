// Monthly per-machine data export, emailed to a fixed admin list. Intended
// to be triggered ONLY by a pg_cron schedule (see supabase_monthly_reports_cron.sql),
// not by the browser - unlike send-report-email, there's no report_requests
// row driving this, no customer-facing UI, and no per-customer email
// address; it always builds one CSV per machine covering the previous
// calendar month and sends it to ADMIN_EMAILS below.
//
// Deliberately CSV, not the branded PDF-with-charts report the web app
// generates client-side (reportService.ts) - that generator depends on
// browser-only APIs (canvas chart rendering, DOM Image loading) and can't
// run headless. Plain data export needs none of that.
import { createClient } from 'npm:@supabase/supabase-js@2';

// Resend's account is still in sandbox mode (no verified domain) as of
// 2026-08-07 - it can only deliver to the account owner's own signup
// address. vaishakhmv151@gmail.com was rejected live (403 validation_error)
// when both were listed. Add it back once a domain is verified at
// resend.com/domains - this account restriction applies to ANY email sent
// through this Resend API key, not just this function (send-report-email
// would hit the same wall the first time it's used with a real, different
// customer address).
const ADMIN_EMAILS = ['prembagya822@gmail.com'];

// Same formula-injection guard and quoting rules as src/utils/csv.ts's
// rowsToCsv - kept in sync manually since this runs in Deno, not the
// browser bundle, and can't import across that boundary.
function rowsToCsv(rows: Record<string, string | number | null>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `\t${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];
  return lines.join('\n');
}

function previousMonthRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const firstOfLastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const label = firstOfLastMonth.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { from: firstOfLastMonth.toISOString(), to: firstOfThisMonth.toISOString(), label };
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { from, to, label } = previousMonthRange();

    const { data: machines, error: machinesError } = await supabase.from('machines').select('id, machine_code, machine_name');
    if (machinesError) throw machinesError;

    const sent: string[] = [];
    const skipped: string[] = [];
    const errors: { machine: string; error: string }[] = [];

    for (const machine of machines ?? []) {
      const { data: rows, error: rowsError } = await supabase
        .from('sensor_data')
        .select('recorded_at, pm1_0, pm2_5, pm4_0, pm10, co2, temperature, humidity')
        .eq('machine_id', machine.id)
        .gte('recorded_at', from)
        .lt('recorded_at', to)
        .order('recorded_at', { ascending: true });

      if (rowsError) {
        errors.push({ machine: machine.machine_code, error: rowsError.message });
        continue;
      }
      if (!rows || rows.length === 0) {
        skipped.push(machine.machine_code);
        continue;
      }

      const csv = rowsToCsv(rows);
      const base64Content = btoa(unescape(encodeURIComponent(csv)));
      const fileName = `${machine.machine_code}-${label.replace(' ', '-')}.csv`;

      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ZYGREEN Reports <onboarding@resend.dev>',
          to: ADMIN_EMAILS,
          subject: `Monthly data export — ${machine.machine_code} (${machine.machine_name}) — ${label}`,
          html: `<p>Attached: all sensor readings for <strong>${machine.machine_code} (${machine.machine_name})</strong> during <strong>${label}</strong> (${rows.length} readings).</p>`,
          attachments: [{ filename: fileName, content: base64Content }],
        }),
      });

      if (!resendResp.ok) {
        const body = await resendResp.json();
        errors.push({ machine: machine.machine_code, error: JSON.stringify(body) });
        continue;
      }
      sent.push(machine.machine_code);
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
