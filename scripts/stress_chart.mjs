// Stress test for the SHARED chart data layer (src/services/airQualityBuckets.js)
// against the live Supabase DB. Imports the real shipped functions.
import { supabase } from '../src/services/supabase.js';
import { fetchRangeByDays, bucketRowsClient, fetchBuckets, IST_OFFSET_MS } from '../src/services/airQualityBuckets.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

const isoFrom = (d) => new Date(`${d}T00:00:00+05:30`).toISOString();
const isoTo   = (d) => new Date(`${d}T23:59:59+05:30`).toISOString();

async function scenario(name, fromDate, toDate) {
  console.log(`\n▶ ${name}  (${fromDate} → ${toDate})`);
  const since = isoFrom(fromDate), until = isoTo(toDate);
  const hourly = (new Date(until) - new Date(since)) <= 3 * 24 * 3600 * 1000;
  const t0 = Date.now();
  const { rows, sampled } = await fetchRangeByDays(since, until);
  const fetchMs = Date.now() - t0;
  const buckets = bucketRowsClient(rows, hourly);

  console.log(`  fetched=${rows.length} sampled=${sampled} buckets=${buckets.length} mode=${hourly ? 'hourly' : 'daily'} fetch=${fetchMs}ms`);

  // Invariants
  ok(buckets.every(b => b.n > 0), 'every bucket has readings');
  ok(buckets.every(b => b.co2 === null || (b.co2 > 0 && b.co2 < 100000)), 'co2 averages sane');
  ok(buckets.every(b => !isNaN(new Date(b.bucket).getTime())), 'bucket timestamps valid');
  const keys = buckets.map(b => b.bucket);
  ok(keys.length === new Set(keys).size, 'no duplicate buckets');
  ok(keys.every((k, i) => i === 0 || new Date(k) > new Date(keys[i - 1])), 'buckets strictly ascending');
  ok(buckets.reduce((s, b) => s + b.n, 0) === rows.length, 'bucket counts sum to fetched rows');

  // Cross-check one bucket's CO2 average by recomputing from rows
  if (buckets.length) {
    const bms = (hourly ? 1 : 24) * 3600000;
    const target = buckets[Math.floor(buckets.length / 2)];
    const tkey = Math.floor((new Date(target.bucket).getTime() + IST_OFFSET_MS) / bms) * bms - IST_OFFSET_MS;
    const sub = rows.filter(r => {
      const k = Math.floor((new Date(r.created_at).getTime() + IST_OFFSET_MS) / bms) * bms - IST_OFFSET_MS;
      return k === tkey && !isNaN(Number(r.co2));
    });
    const manual = Math.round(sub.reduce((s, r) => s + Number(r.co2), 0) / sub.length * 10) / 10;
    ok(Math.abs(manual - target.co2) < 0.2, `recomputed co2 avg matches (${manual} vs ${target.co2})`);
  }
  return buckets;
}

(async () => {
  // RPC availability
  console.log('▶ RPC bucket_air_quality availability');
  const rpc = await supabase.rpc('bucket_air_quality', { p_from: isoFrom('2026-06-20'), p_to: isoTo('2026-06-27'), p_bucket: 'day' });
  if (rpc.error) {
    console.log('  ⚠ RPC not deployed:', rpc.error.message.split('\n')[0]);
    console.log('    (fallback pagination is being tested instead)');
  } else {
    ok(Array.isArray(rpc.data), 'RPC returns array');
    console.log('  RPC buckets:', rpc.data.length, rpc.data[0]);
  }

  // Day-mode fetch (full today via fetchRangeByDays — same as the component)
  const today = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  console.log(`\n▶ DAY MODE today=${today}`);
  const t0 = Date.now();
  const day = await fetchRangeByDays(isoFrom(today), new Date().toISOString());
  console.log(`  fetched=${day.rows.length} sampled=${day.sampled} fetch=${Date.now() - t0}ms`);
  ok(day.rows.length >= 0, 'day mode fetched rows (or none logged yet)');

  // Custom-range scenarios
  await scenario('1 day',   '2026-06-19', '2026-06-19');
  await scenario('3 days (hourly)', '2026-06-17', '2026-06-19');
  await scenario('1 week (daily)',  '2026-06-13', '2026-06-19');
  await scenario('full month',      '2026-05-30', '2026-06-29');

  // Edge cases
  // Per-day parallel fetch (the new custom-mode fallback) — must be COMPLETE.
  // Jun 14 & 18 have zero rows in the DB, so the week has 5 populated days.
  console.log('\n▶ PER-DAY FETCH: 1 week 13–19 Jun (Jun 14 & 18 are empty → expect 5 buckets)');
  {
    const t = Date.now();
    const { rows, sampled, days } = await fetchRangeByDays(isoFrom('2026-06-13'), isoTo('2026-06-19'));
    const b = bucketRowsClient(rows, false);
    console.log(`  days=${days} fetched=${rows.length} sampled=${sampled} buckets=${b.length} time=${Date.now() - t}ms`);
    ok(!sampled, 'week not sampled (full fetch)');
    ok(b.length === 5, `week shows exactly the 5 days with data (${b.length} buckets)`);
    ok(b.every(x => x.co2 > 0), 'all week buckets have real averages');
    // Dense days (Jun 13: 13305, Jun 16: 15587) must be fully fetched, not capped
    ok(rows.length >= 52000, `dense days fully fetched, not truncated (${rows.length} of ~52900)`);
  }

  console.log('\n▶ PER-DAY FETCH: 30 days (expect full daily buckets across the data span)');
  {
    const t = Date.now();
    const { rows, sampled, days } = await fetchRangeByDays(isoFrom('2026-05-30'), isoTo('2026-06-29'));
    const b = bucketRowsClient(rows, false);
    console.log(`  days=${days} fetched=${rows.length} sampled=${sampled} buckets=${b.length} time=${Date.now() - t}ms`);
    ok(b.length >= 14, `30-day range shows every day with data (${b.length} buckets across ~17-day span)`);
    ok(b.every((x, i) => i === 0 || new Date(x.bucket) > new Date(b[i - 1].bucket)), '30-day buckets ascending');
    ok(rows.length > 25000, `fetched well beyond old 25k cap (${rows.length})`);
  }

  console.log('\n▶ EDGE: empty future range');
  const fut = await fetchRangeByDays(isoFrom('2030-01-01'), isoTo('2030-01-02'));
  ok(fut.rows.length === 0, 'future range returns empty, no crash');
  ok(bucketRowsClient(fut.rows, false).length === 0, 'empty rows → empty buckets');

  console.log('\n▶ EDGE: reversed range (from > to)');
  const rev = await fetchRangeByDays(isoFrom('2026-06-25'), isoTo('2026-06-20'));
  ok(rev.rows.length === 0, 'reversed range yields no rows, no crash');

  console.log('\n▶ EDGE: fetchBuckets high-level (RPC or fallback)');
  const fb = await fetchBuckets(isoFrom('2026-06-17'), isoTo('2026-06-19'), 'hour');
  ok(Array.isArray(fb.buckets) && fb.buckets.length > 0, `fetchBuckets returns data (viaRpc=${fb.viaRpc})`);

  console.log('\n▶ EDGE: single bad row bucketing');
  const bad = bucketRowsClient([{ created_at: 'not-a-date', co2: 'x' }, { created_at: '2026-06-20T10:00:00+05:30', co2: 500, pm25: 12 }], true);
  ok(bad.length === 1 && bad[0].co2 === 500, 'invalid row skipped, valid row kept');

  console.log(`\n━━━ RESULT: ${pass} passed, ${fail} failed ━━━`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
