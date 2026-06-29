import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fetchRangeByDays, fetchBuckets } from '../../services/airQualityBuckets';
import { useAppStore } from '../../store/useAppStore';
import './LiveCharts.css';

/* ─── config ──────────────────────────────────────────────── */
const METRICS = {
  co2:         { label: 'CO₂',        color: '#ef4444', unit: 'ppm',   threshold: 1000 },
  pm1:         { label: 'PM1.0',       color: '#22c55e', unit: 'µg/m³', threshold: null },
  pm25:        { label: 'PM2.5',       color: '#eab308', unit: 'µg/m³', threshold: 35  },
  pm4:         { label: 'PM4.0',       color: '#f97316', unit: 'µg/m³', threshold: null },
  pm10:        { label: 'PM10',        color: '#a855f7', unit: 'µg/m³', threshold: null },
  temperature: { label: 'Temperature', color: '#0ea5e9', unit: '°C',    threshold: null },
  humidity:    { label: 'Humidity',    color: '#2196f3', unit: '%',     threshold: null },
};

const IST_TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function istMidnightUTC() {
  const nowIST = Date.now() + IST_OFFSET_MS;
  const midIST = Math.floor(nowIST / 86_400_000) * 86_400_000;
  return midIST - IST_OFFSET_MS;
}

function istDateString(ms) {
  const d = new Date(ms + IST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISTString() {
  return istDateString(Date.now());
}

// n days before today (IST). Used for the 30-day default + 31-day retention bound.
function daysAgoISTString(n) {
  return istDateString(Date.now() - n * 86_400_000);
}

const RETENTION_DAYS = 31;   // Supabase auto-deletes rows older than this

/* ─── chart data builders ─────────────────────────────────── */

function buildDayData(rows, metricKey, fromHour, toHour) {
  const dayStartUTC = istMidnightUTC();
  const nowUTC      = Date.now();

  return rows
    .filter(row => {
      const ms = row.recorded_at ? new Date(row.recorded_at).getTime() : null;
      if (!ms || ms < dayStartUTC || ms > nowUTC) return false;
      const istHour = new Date(ms + IST_OFFSET_MS).getUTCHours();
      return istHour >= fromHour && istHour <= toHour;
    })
    .map(row => {
      const ms  = new Date(row.recorded_at).getTime();
      const val = metricKey === 'pm25' ? Number(row.pm25) : Number(row[metricKey]);
      const d   = new Date(ms + IST_OFFSET_MS);
      const hh  = String(d.getUTCHours()).padStart(2, '0');
      const mm  = String(d.getUTCMinutes()).padStart(2, '0');
      const ss  = String(d.getUTCSeconds()).padStart(2, '0');
      return {
        time:    `${hh}:${mm}`,
        tipTime: `${hh}:${mm}:${ss} IST`,
        value:   isNaN(val) ? null : Math.round(val * 10) / 10,
        utcMs:   ms,
      };
    })
    .sort((a, b) => a.utcMs - b.utcMs);
}

// Custom range: map server-side aggregated buckets to chart points.
// `buckets` rows come from the bucket_air_quality RPC (already IST-aligned).
function buildCustomData(buckets, metricKey, isHourly) {
  return buckets.map(b => {
    const d   = new Date(b.bucket);
    const val = metricKey === 'pm25' ? Number(b.pm25) : Number(b[metricKey]);
    const time    = isHourly
      ? d.toLocaleString('en-IN', { hour: '2-digit', hour12: false, day: 'numeric', month: 'short', timeZone: IST_TZ })
      : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: IST_TZ });
    const tipTime = isHourly
      ? d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', hour12: false, timeZone: IST_TZ }) + ' IST'
      : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'long', day: 'numeric', timeZone: IST_TZ });
    return {
      time,
      tipTime,
      value: isNaN(val) ? null : Math.round(val * 10) / 10,
    };
  });
}

function normalise(row, tsCol) {
  return { ...row, recorded_at: row[tsCol] || row.recorded_at || row.created_at };
}

/* ─── component ───────────────────────────────────────────── */
export const LiveCharts = () => {
  const [metric,      setMetric]      = useState('co2');
  const [mode,        setMode]        = useState('day');   // 'day' | 'custom'
  const [dayFromHour, setDayFromHour] = useState(0);
  const [dayToHour,   setDayToHour]   = useState(23);
  const [customFrom,  setCustomFrom]  = useState(() => daysAgoISTString(29)); // last 30 days incl. today
  const [customTo,    setCustomTo]    = useState(todayISTString);
  const [rows,        setRows]        = useState([]);     // raw rows (day mode)
  const [buckets,     setBuckets]     = useState([]);     // aggregated buckets (custom mode)
  const [loading,     setLoading]     = useState(false);
  const [fetchErr,    setFetchErr]    = useState(null);
  const [notice,      setNotice]      = useState(null);

  const liveReading = useAppStore(state => state.liveReading);
  const prevLiveRef = useRef(null);

  const isHourly = mode === 'custom' &&
    (new Date(`${customTo}T00:00:00+05:30`) - new Date(`${customFrom}T00:00:00+05:30`)) <= 3 * 24 * 3600 * 1000;

  /* ── DAY MODE fetch: full day of raw readings (paginated past the 1000 cap)
        so the hour selector works across the whole day. Live append continues. ── */
  const fetchDay = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    setNotice(null);
    const since = new Date(istMidnightUTC()).toISOString();
    const until = new Date().toISOString();
    try {
      const { rows: r } = await fetchRangeByDays(since, until);
      setRows(r.map(row => ({ ...row, recorded_at: row.created_at })));
    } catch (e) {
      setFetchErr(e?.message || 'Could not load readings');
    }
    setLoading(false);
  }, []);

  /* ── CUSTOM MODE fetch: shared aggregation (RPC fast path, per-day fallback). ── */
  const fetchCustom = useCallback(async () => {
    setLoading(true);
    setFetchErr(null);
    setNotice(null);
    const since  = new Date(`${customFrom}T00:00:00+05:30`).toISOString();
    const until  = new Date(`${customTo}T23:59:59+05:30`).toISOString();
    const hourly = (new Date(until) - new Date(since)) <= 3 * 24 * 3600 * 1000;

    try {
      const { buckets: b, sampled } = await fetchBuckets(since, until, hourly ? 'hour' : 'day');
      setBuckets(b);
      if (sampled) {
        setNotice('Long range — showing a daily sample. Run supabase_bucket_function.sql in Supabase for exact averages.');
      }
    } catch (e) {
      setBuckets([]);
      setFetchErr(e?.message || 'Could not load range');
    }
    setLoading(false);
  }, [customFrom, customTo]);

  const fetchData = useCallback(() => {
    return mode === 'day' ? fetchDay() : fetchCustom();
  }, [mode, fetchDay, fetchCustom]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (mode !== 'day') return;
    const t = setInterval(fetchDay, 5 * 60_000);
    return () => clearInterval(t);
  }, [mode, fetchDay]);

  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData]);

  /* ── real-time append (day mode only) ── */
  useEffect(() => {
    if (!liveReading || mode !== 'day') return;
    if (prevLiveRef.current?.id === liveReading.id) return;
    prevLiveRef.current = liveReading;
    setRows(prev => {
      if (prev.some(r => r.id === liveReading.id)) return prev;
      const ts = liveReading.recorded_at || liveReading.created_at;
      const lr = { ...liveReading, recorded_at: ts };
      const next = [...prev, lr];
      return next.length > 15000 ? next.slice(-15000) : next;
    });
  }, [liveReading, mode]);

  /* ── chart data ── */
  const data = useMemo(() => {
    if (mode === 'day') {
      let chartRows = rows;
      if (liveReading && !rows.some(r => r.id === liveReading.id)) {
        chartRows = [...rows, normalise(liveReading, 'recorded_at')];
      }
      return buildDayData(chartRows, metric, dayFromHour, dayToHour);
    }
    return buildCustomData(buckets, metric, isHourly);
  }, [rows, buckets, mode, metric, dayFromHour, dayToHour, isHourly, liveReading]);

  const mcfg = METRICS[metric];

  const last = useMemo(() => {
    if (liveReading && mode === 'day') {
      const v = metric === 'pm25' ? Number(liveReading.pm25) : Number(liveReading[metric]);
      if (!isNaN(v)) return Math.round(v * 10) / 10;
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].value !== null) return data[i].value;
    }
    return null;
  }, [data, liveReading, metric, mode]);

  /* ── tooltip ── */
  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const pt = payload[0].payload;
    if (pt.value === null) return null;
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '8px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        minWidth: 120,
      }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{pt.tipTime}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
          {pt.value}
          <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', marginLeft: 4 }}>{mcfg.unit}</span>
        </div>
      </div>
    );
  };

  const ModeBtn = ({ k, label }) => (
    <button
      onClick={() => setMode(k)}
      style={{
        padding: '5px 16px', borderRadius: 20,
        border: mode === k ? '1.5px solid #2196f3' : '1.5px solid #e2e8f0',
        background: mode === k ? '#2196f3' : '#fff',
        color: mode === k ? '#fff' : '#64748b',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s', letterSpacing: '0.03em',
      }}
    >{label}</button>
  );

  const MetricBtn = ({ k }) => {
    const c = METRICS[k].color;
    return (
      <button
        onClick={() => setMetric(k)}
        style={{
          padding: '4px 12px', borderRadius: 20,
          border: metric === k ? `1.5px solid ${c}` : '1.5px solid #e2e8f0',
          background: metric === k ? `${c}18` : '#fff',
          color: metric === k ? c : '#94a3b8',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >{METRICS[k].label}</button>
    );
  };

  const pointCount  = data.filter(d => d.value !== null).length;
  const isMultiDay  = mode === 'custom' && !isHourly;
  const xInterval   = Math.max(0, Math.floor(pointCount / 10) - 1);
  const xAngle      = -45;
  const xHeight     = 48;

  const headerLabel = mode === 'day'
    ? `Today  ${String(dayFromHour).padStart(2,'0')}:00 – ${String(dayToHour).padStart(2,'0')}:59  IST`
    : `${customFrom}  →  ${customTo}`;

  const footerLeft = mode === 'day'
    ? `Today ${String(dayFromHour).padStart(2,'0')}:00–${String(dayToHour).padStart(2,'0')}:59 IST · ${pointCount} pts`
    : `${customFrom} → ${customTo} · ${pointCount} pts · ${isMultiDay ? 'daily avg' : 'hourly avg'}`;

  const footerRight = mode === 'day'
    ? '● Live — updates on new reading'
    : 'Historical data';

  return (
    <div className="lc-root">

      {/* header */}
      <div className="lc-header">
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {mcfg.label} · {headerLabel}
            {mode === 'day' && (
              <span style={{ marginLeft: 8, background: '#dbeafe', color: '#2196f3', fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                ● LIVE
              </span>
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
            {last !== null ? last : '—'}
            <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginLeft: 6 }}>{mcfg.unit}</span>
          </div>
        </div>

        <div className="lc-controls">

          {/* Mode toggle */}
          <div className="lc-range-row">
            <ModeBtn k="day"    label="Today" />
            <ModeBtn k="custom" label="Custom Range" />
          </div>

          {/* Day mode: hour range */}
          {mode === 'day' && (
            <div className="lc-picker-row">
              <span className="lc-picker-label">From</span>
              <select
                className="lc-select"
                value={dayFromHour}
                onChange={e => {
                  const v = Number(e.target.value);
                  setDayFromHour(v);
                  if (dayToHour < v) setDayToHour(v);
                }}
              >
                {HOURS.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                ))}
              </select>
              <span className="lc-picker-label">To</span>
              <select
                className="lc-select"
                value={dayToHour}
                onChange={e => setDayToHour(Number(e.target.value))}
              >
                {HOURS.filter(h => h >= dayFromHour).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2,'0')}:59</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom mode: date range */}
          {mode === 'custom' && (
            <div className="lc-picker-row">
              <span className="lc-picker-label">From</span>
              <input
                type="date"
                className="lc-date-input"
                value={customFrom}
                min={daysAgoISTString(RETENTION_DAYS - 1)}
                max={customTo}
                onChange={e => setCustomFrom(e.target.value)}
              />
              <span className="lc-picker-label">To</span>
              <input
                type="date"
                className="lc-date-input"
                value={customTo}
                min={customFrom}
                max={todayISTString()}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>
          )}

          {/* Metric buttons */}
          <div className="lc-metric-row">
            {Object.keys(METRICS).map(k => <MetricBtn key={k} k={k} />)}
          </div>
        </div>
      </div>

      {/* non-blocking notice (e.g. partial coverage without the DB function) */}
      {notice && !loading && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e',
          borderRadius: 8, padding: '8px 12px', fontSize: 11, marginBottom: 12,
        }}>
          ⚠ {notice}
        </div>
      )}

      {/* chart */}
      <div className="lc-chart-area">
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading…
          </div>
        ) : fetchErr ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#ef4444', fontSize: 13, padding: '0 24px' }}>
            {fetchErr}
          </div>
        ) : data.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            No data for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="0" strokeWidth={0.8} />

              <XAxis
                dataKey="time"
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
                tickLine={{ stroke: '#1e293b', strokeWidth: 1.5 }}
                interval={xInterval}
                angle={xAngle}
                textAnchor={xAngle === -45 ? 'end' : 'middle'}
                height={xHeight}
                label={isMultiDay ? {
                  value: 'Date (IST)', position: 'insideBottom', offset: -12,
                  style: { fill: '#1e293b', fontSize: 12, fontWeight: 700 },
                } : undefined}
              />

              <YAxis
                tick={{ fill: '#475569', fontSize: 11 }}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
                tickLine={{ stroke: '#1e293b', strokeWidth: 1.5 }}
                domain={['auto', 'auto']}
                width={52}
                label={{
                  value: `${mcfg.label} (${mcfg.unit})`, angle: -90,
                  position: 'insideLeft', offset: 14,
                  style: { fill: '#1e293b', fontSize: 12, fontWeight: 700 },
                }}
              />

              <Tooltip
                content={<Tip />}
                cursor={{ stroke: mcfg.color, strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.6 }}
              />

              {mcfg.threshold && (
                <ReferenceLine
                  y={mcfg.threshold}
                  stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5}
                  label={{ value: `${mcfg.threshold} ${mcfg.unit}`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                />
              )}

              <Line
                type="monotone" dataKey="value"
                stroke={mcfg.color} strokeWidth={3}
                dot={pointCount > 300 ? false : { r: 3, fill: mcfg.color, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: mcfg.color, stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false} isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* footer */}
      <div className="lc-footer">
        <span>{footerLeft}</span>
        <span>{footerRight}</span>
      </div>
    </div>
  );
};
