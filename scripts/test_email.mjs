// Quick local test of the monthly ZyGreen email report — sends the same
// 30-day daily-summary CSV via Resend, WITHOUT needing the Supabase cron/vault.
//
// Usage:
//   node scripts/test_email.mjs <RESEND_API_KEY> [recipient1,recipient2] [from]
//
// Examples:
//   node scripts/test_email.mjs re_abc123
//   node scripts/test_email.mjs re_abc123 you@gmail.com
//   node scripts/test_email.mjs re_abc123 a@x.com,b@y.com "ZyGreen <reports@yourdomain.com>"
//
// IMPORTANT (Resend rule): with the default test sender onboarding@resend.dev
// you can usually only deliver to the email you SIGNED UP to Resend with.
// To send to other addresses, verify a domain in Resend and pass it as <from>.

import { fetchRangeByDays, IST_OFFSET_MS } from '../src/services/airQualityBuckets.js';

const apiKey = process.argv[2] || process.env.RESEND_API_KEY;
const recipients = (process.argv[3] || 'prembagya822@gmail.com,zygreeninnovations@gmail.com')
  .split(',').map(s => s.trim()).filter(Boolean);
const from = process.argv[4] || 'ZyGreen Reports <onboarding@resend.dev>';

if (!apiKey) {
  console.error('Missing Resend API key.\n  node scripts/test_email.mjs <RESEND_API_KEY> [recipients] [from]');
  process.exit(1);
}

const r1 = (n) => Math.round(n * 10) / 10;
const istDay = (ts) => new Date(ts + IST_OFFSET_MS).toISOString().slice(0, 10);

function buildCsv(rows) {
  const days = new Map();
  for (const row of rows) {
    const ts = new Date(row.created_at).getTime();
    if (isNaN(ts)) continue;
    const key = istDay(ts);
    let d = days.get(key);
    if (!d) { d = { n: 0, co2: [], pm25: [], pm1: [], pm4: [], pm10: [], temp: [], hum: [] }; days.set(key, d); }
    d.n++;
    const push = (arr, v) => { const x = Number(v); if (!isNaN(x)) arr.push(x); };
    push(d.co2, row.co2); push(d.pm25, row.pm25); push(d.pm1, row.pm1);
    push(d.pm4, row.pm4); push(d.pm10, row.pm10); push(d.temp, row.temperature); push(d.hum, row.humidity);
  }
  const avg = a => a.length ? r1(a.reduce((s, x) => s + x, 0) / a.length) : '';
  const min = a => a.length ? r1(Math.min(...a)) : '';
  const max = a => a.length ? r1(Math.max(...a)) : '';

  const header = 'Date,Readings,CO2 avg (ppm),CO2 min,CO2 max,PM2.5 avg,PM2.5 min,PM2.5 max,PM1.0 avg,PM4.0 avg,PM10 avg,Temp avg (C),Humidity avg (%)';
  const lines = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, d]) =>
    [day, d.n, avg(d.co2), min(d.co2), max(d.co2), avg(d.pm25), min(d.pm25), max(d.pm25),
      avg(d.pm1), avg(d.pm4), avg(d.pm10), avg(d.temp), avg(d.hum)].join(','));
  return { csv: [header, ...lines].join('\n'), dayCount: days.size };
}

(async () => {
  const until = new Date().toISOString();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  console.log('Fetching last 30 days from Supabase…');
  const { rows } = await fetchRangeByDays(since, until);
  console.log(`Fetched ${rows.length} rows.`);

  const { csv, dayCount } = buildCsv(rows);
  console.log(`Built CSV with ${dayCount} daily-summary rows.`);

  // Dry run: print the CSV and exit without sending (no key/Resend needed).
  if (apiKey === 'dryrun') {
    console.log('\n----- CSV preview (dry run, not sent) -----\n' + csv + '\n----- end -----');
    return;
  }

  const b64 = Buffer.from(csv, 'utf8').toString('base64');

  const fromD = new Date(Date.now() - 30 * 86_400_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const toD = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const filename = `zygreen_report_${since.slice(0, 10)}_to_${until.slice(0, 10)}.csv`;

  console.log(`Sending to: ${recipients.join(', ')}  (from: ${from})`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `ZyGreen Air Quality Report — ${toD} (TEST)`,
      html: `<div style="font-family:Arial,sans-serif;color:#0f172a">
        <h2 style="color:#16a34a">ZyGreen — Air Quality Report (test)</h2>
        <p>Daily-summary report (CSV attached) for <b>${fromD}</b> to <b>${toD}</b> — ${dayCount} days.</p>
        <p style="color:#64748b;font-size:12px">Device: Machine 1 · sent via local test script.</p></div>`,
      attachments: [{ filename, content: b64 }],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log('✓ Sent. Resend id:', body.id, '\n  Check inboxes + spam.');
  } else {
    console.error(`✗ Resend error ${res.status}:`, JSON.stringify(body));
    process.exit(1);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
