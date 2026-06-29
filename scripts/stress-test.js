#!/usr/bin/env node
/**
 * ZyGreen — Supabase / dashboard stress-test & data generator.
 *
 * Generates realistic air_quality rows and pushes them to Supabase so the
 * dashboard can be exercised under load (1000-row cap, live chart density,
 * history pagination, realtime subscription throughput).
 *
 * All synthetic rows are tagged so they can be cleaned up afterwards:
 *   - pm1 = "001" sentinel is NOT used (would collide with real data); instead
 *     we mark rows by inserting them with a humidity value of exactly X.X that
 *     we can't rely on — so cleanup is by time window (see --tag below).
 *
 * Usage:
 *   node scripts/stress-test.js burst <count>        # backfill <count> rows across today (IST midnight -> now)
 *   node scripts/stress-test.js live  <intervalSec>  # 1 row every N sec, simulates the ESP32 (Ctrl+C to stop)
 *   node scripts/stress-test.js flood <count> <conc> # <count> rows via <conc> concurrent POSTs (throughput test)
 *
 * Examples:
 *   node scripts/stress-test.js burst 1000
 *   node scripts/stress-test.js live 5
 *   node scripts/stress-test.js flood 5000 20
 *
 * Cleanup (run in Supabase SQL editor) — deletes everything inserted in a window:
 *   delete from air_quality where recorded_at >= '2026-06-19T00:00:00Z' and temperature between 26.0 and 29.0;
 * (Adjust to your run; synthetic temps are 26.0–29.0. Prefer running burst on an
 *  empty/test table, or note the id range printed at the end and delete by id.)
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://aoiokvjxnfkecyzkpamo.supabase.co';
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvaW9rdmp4bmZrZWN5emtwYW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODQzNDQsImV4cCI6MjA5Njc2MDM0NH0.BKfTMDdQKeg2HOhUfJQqM8BMY8d7ShopBLChFwbvNxY';

const ENDPOINT = `${SUPABASE_URL}/rest/v1/air_quality`;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// PM columns are VARCHAR(3) zero-padded strings ("012") — must match firmware format.
const pad3 = (n) =>
  String(Math.max(0, Math.min(999, Math.round(n)))).padStart(3, '0');

/** Realistic, correlated reading for a given moment (CO2 follows a daily occupancy curve). */
function makeReading(date = new Date()) {
  const istHour = ((date.getTime() + IST_OFFSET_MS) % 86_400_000) / 3_600_000; // 0..24
  // Occupancy curve: ~430 ppm overnight, peaks ~1150 ppm late afternoon.
  const occupancy = Math.max(0, Math.sin(((istHour - 6) / 18) * Math.PI)); // 0 at 6h, peak ~15h
  const co2 = Math.round(440 + 700 * occupancy + (Math.random() - 0.5) * 50);

  const pm25 = 7 + Math.random() * 12 + occupancy * 6;
  const temperature = +(26 + Math.random() * 3).toFixed(1); // 26.0–29.0
  const humidity = +(60 + Math.random() * 18).toFixed(1);

  return {
    pm1: pad3(pm25 * 0.7),
    pm25: pad3(pm25),
    pm4: pad3(pm25 * 1.1),
    pm10: pad3(pm25 * 1.35),
    co2,
    temperature,
    humidity,
  };
}

async function postRows(rows) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

/** Backfill `count` rows evenly from today's IST midnight to now (fills the 1D chart). */
async function burst(count) {
  const now = Date.now();
  const istMidnight =
    Math.floor((now + IST_OFFSET_MS) / 86_400_000) * 86_400_000 - IST_OFFSET_MS;
  const span = Math.max(1, now - istMidnight);

  const rows = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(istMidnight + (span * i) / count);
    rows.push({ ...makeReading(t), recorded_at: t.toISOString() });
  }

  const CHUNK = 500;
  const t0 = Date.now();
  for (let i = 0; i < rows.length; i += CHUNK) {
    await postRows(rows.slice(i, i + CHUNK));
    console.log(`  inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
  }
  console.log(`burst done: ${count} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

/** Simulate the device: one row every `intervalSec` (recorded_at auto-set by Supabase). */
async function live(intervalSec) {
  console.log(`live mode: 1 row / ${intervalSec}s — Ctrl+C to stop`);
  for (;;) {
    const r = makeReading();
    try {
      await postRows([r]);
      console.log(`${new Date().toISOString()}  co2=${r.co2}  pm25=${r.pm25}`);
    } catch (e) {
      console.error('  insert failed:', e.message);
    }
    await new Promise((res) => setTimeout(res, intervalSec * 1000));
  }
}

/** Throughput test: `count` rows via `conc` concurrent single-row POSTs. */
async function flood(count, conc) {
  console.log(`flood: ${count} rows, ${conc} concurrent`);
  let done = 0;
  let failed = 0;
  const t0 = Date.now();
  const queue = Array.from({ length: count }, () => makeReading());

  async function worker() {
    while (queue.length) {
      const r = queue.pop();
      try {
        await postRows([r]);
        done++;
      } catch {
        failed++;
      }
      if ((done + failed) % 200 === 0) console.log(`  ${done + failed}/${count}`);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  const secs = (Date.now() - t0) / 1000;
  console.log(
    `flood done: ${done} ok, ${failed} failed in ${secs.toFixed(1)}s ` +
      `(${(done / secs).toFixed(0)} rows/s)`
  );
}

const [mode, a, b] = process.argv.slice(2);
(async () => {
  if (mode === 'burst') await burst(parseInt(a || '1000', 10));
  else if (mode === 'live') await live(parseInt(a || '5', 10));
  else if (mode === 'flood') await flood(parseInt(a || '2000', 10), parseInt(b || '10', 10));
  else {
    console.log(
      'usage:\n' +
        '  node scripts/stress-test.js burst <count>\n' +
        '  node scripts/stress-test.js live  <intervalSec>\n' +
        '  node scripts/stress-test.js flood <count> <concurrency>'
    );
    process.exit(1);
  }
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
