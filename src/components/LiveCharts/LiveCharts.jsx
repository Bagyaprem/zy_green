import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { supabase } from '../../services/supabase';
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

const RANGES = {
  '1D': {
    label: '1 Day',
    hours: 24,
    limit: 1000,
    bucketMs: 60 * 60 * 1000,
    fmtX:   (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', hour12: false, timeZone: IST_TZ }),
    fmtTip: (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST_TZ }),
    xLabel: 'Time IST',
  },
  '1W': {
    label: '1 Week',
    hours: 168,
    limit: 1000,
    bucketMs: 24 * 60 * 60 * 1000,
    fmtX:   (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: IST_TZ }),
    fmtTip: (d) => d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', timeZone: IST_TZ }),
    xLabel: 'Day (IST)',
  },
  '1M': {
    label: '1 Month',
    hours: 720,
    limit: 1000,
    bucketMs: 5 * 24 * 60 * 60 * 1000,
    fmtX:   (d) => d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: IST_TZ }),
    fmtTip: (d) => d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', timeZone: IST_TZ }),
    xLabel: 'Date (IST)',
  },
};

/* ─── IST helpers (UTC+5:30, hardcoded — browser tz never matters) ─── */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istMidnightUTC() {
  const nowIST = Date.now() + IST_OFFSET_MS;
  const midIST = Math.floor(nowIST / 86_400_000) * 86_400_000;
  return midIST - IST_OFFSET_MS;
}

/* ─── chart data builders ─────────────────────────────────── */

// Raw individual readings for 1D — no averaging, newest-1000 from today, oldest→newest.
function buildRawDayData(rows, metricKey) {
  const dayStartUTC = istMidnightUTC();
  const nowUTC      = Date.now();

  return rows
    .filter(row => {
      const ms = row.recorded_at ? new Date(row.recorded_at).getTime() : null;
      return ms && ms >= dayStartUTC && ms <= nowUTC;
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

// Bucket-averaged data for 1W / 1M.
function bucketAverage(rows, rcfg, metricKey) {
  if (!rows.length) return [];
  const map = {};
  rows.forEach(row => {
    const ts = row.recorded_at ? new Date(row.recorded_at).getTime() : null;
    if (!ts) return;
    const key = Math.floor(ts / rcfg.bucketMs) * rcfg.bucketMs;
    if (!map[key]) map[key] = { sum: 0, count: 0 };
    const val = metricKey === 'pm25' ? Number(row.pm25) : Number(row[metricKey]);
    if (!isNaN(val)) { map[key].sum += val; map[key].count++; }
  });
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bucket, { sum, count }]) => ({
      time:    rcfg.fmtX(new Date(Number(bucket))),
      tipTime: rcfg.fmtTip(new Date(Number(bucket))),
      value:   count > 0 ? Math.round((sum / count) * 10) / 10 : null,
    }));
}

/* ─── normalise a row so recorded_at is always populated ─── */
function normalise(row, tsCol) {
  return { ...row, recorded_at: row[tsCol] || row.recorded_at || row.created_at };
}

/* ─── component ───────────────────────────────────────────── */
export const LiveCharts = () => {
  const [metric,  setMetric]  = useState('co2');
  const [range,   setRange]   = useState('1D');
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);

  const liveReading = useAppStore(state => state.liveReading);
  const prevLiveRef = useRef(null);

  /* ── fetch: always DESC so cap returns newest rows, then reverse for display ── */
  const fetchData = useCallback(async (r) => {
    setLoading(true);
    const rcfg = RANGES[r];
    const since = r === '1D'
      ? new Date(istMidnightUTC()).toISOString()
      : new Date(Date.now() - rcfg.hours * 3_600_000).toISOString();

    for (const tsCol of ['recorded_at', 'created_at']) {
      const { data, error } = await supabase
        .from('air_quality')
        .select(`id, co2, pm25, pm1, pm4, pm10, temperature, humidity, ${tsCol}`)
        .gte(tsCol, since)
        .order(tsCol, { ascending: false })
        .limit(rcfg.limit);

      if (!error && data) {
        setRows([...data].reverse().map(row => normalise(row, tsCol)));
        setLoading(false);
        return;
      }
    }

    const { data: fb } = await supabase
      .from('air_quality')
      .select('id, co2, pm25, pm1, pm4, pm10, temperature, humidity')
      .order('id', { ascending: false })
      .limit(RANGES[r].limit);
    if (fb) setRows([...fb].reverse());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  useEffect(() => {
    const t = setInterval(() => fetchData(range), 5 * 60_000);
    return () => clearInterval(t);
  }, [range, fetchData]);

  useEffect(() => {
    const onFocus = () => fetchData(range);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [range, fetchData]);

  /* ── real-time: append each new reading instantly (1D only) ── */
  useEffect(() => {
    if (!liveReading || range !== '1D') return;
    if (prevLiveRef.current?.id === liveReading.id) return;
    prevLiveRef.current = liveReading;
    setRows(prev => {
      if (prev.some(r => r.id === liveReading.id)) return prev;
      const lr = normalise(liveReading, 'recorded_at');
      const next = [...prev, lr];
      return next.length > 1100 ? next.slice(-1000) : next;
    });
  }, [liveReading, range]);

  /* ── chart data ── */
  const data = useMemo(() => {
    let chartRows = rows;
    if (liveReading && range === '1D' && !rows.some(r => r.id === liveReading.id)) {
      chartRows = [...rows, normalise(liveReading, 'recorded_at')];
    }
    return range === '1D'
      ? buildRawDayData(chartRows, metric)
      : bucketAverage(chartRows, RANGES[range], metric);
  }, [rows, range, metric, liveReading]);

  const mcfg = METRICS[metric];
  const rcfg = RANGES[range];

  const last = useMemo(() => {
    if (liveReading) {
      const v = metric === 'pm25' ? Number(liveReading.pm25) : Number(liveReading[metric]);
      if (!isNaN(v)) return Math.round(v * 10) / 10;
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].value !== null) return data[i].value;
    }
    return null;
  }, [data, liveReading, metric]);

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

  const RangeBtn = ({ k }) => (
    <button
      onClick={() => setRange(k)}
      style={{
        padding: '5px 16px', borderRadius: 20,
        border: range === k ? '1.5px solid #2196f3' : '1.5px solid #e2e8f0',
        background: range === k ? '#2196f3' : '#fff',
        color: range === k ? '#fff' : '#64748b',
        fontSize: 12, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s', letterSpacing: '0.03em',
      }}
    >{RANGES[k].label}</button>
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

  const pointCount = data.filter(d => d.value !== null).length;
  const xInterval  = range === '1D'
    ? Math.max(0, Math.floor(pointCount / 10) - 1)
    : 'preserveStartEnd';

  return (
    <div className="lc-root">

      {/* header */}
      <div className="lc-header">
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {mcfg.label} · {rcfg.label}
            {range === '1D' && (
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
          <div className="lc-range-row">
            {Object.keys(RANGES).map(k => <RangeBtn key={k} k={k} />)}
          </div>
          <div className="lc-metric-row">
            {Object.keys(METRICS).map(k => <MetricBtn key={k} k={k} />)}
          </div>
        </div>
      </div>

      {/* chart */}
      <div className="lc-chart-area">
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading…
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
                angle={range === '1D' ? -45 : 0}
                textAnchor={range === '1D' ? 'end' : 'middle'}
                height={range === '1D' ? 48 : 36}
                label={range !== '1D' ? {
                  value: rcfg.xLabel, position: 'insideBottom', offset: -12,
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
        <span>
          {range === '1D' ? 'Today · most recent readings (midnight IST → now)' : range === '1W' ? 'Daily averages' : '5-day averages'}
          {' · '}{pointCount} points
        </span>
        <span>{range === '1D' ? '● Live — updates on new reading' : `Past ${rcfg.hours}h`}</span>
      </div>
    </div>
  );
};
