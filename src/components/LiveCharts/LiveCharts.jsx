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
  co2:         { label: 'CO₂',        color: '#2196f3', unit: 'ppm',   threshold: 1000 },
  pm25:        { label: 'PM2.5',       color: '#2196f3', unit: 'µg/m³', threshold: 35  },
  temperature: { label: 'Temperature', color: '#2196f3', unit: '°C',    threshold: null },
  humidity:    { label: 'Humidity',    color: '#2196f3', unit: '%',     threshold: null },
};

const RANGES = {
  '1D': {
    label: '1 Day',
    hours: 24,
    bucketMs: 60 * 60 * 1000,
    limit: 10000,
    fmtX:   (d) => `${String(d.getHours()).padStart(2, '0')}:00`,
    fmtTip: (d) => {
      const h = d.getHours();
      return `${String(h).padStart(2,'0')}:00 – ${String(h + 1).padStart(2,'0')}:00`;
    },
    xLabel: 'Time (hours)',
  },
  '1W': {
    label: '1 Week',
    hours: 168,
    bucketMs: 24 * 60 * 60 * 1000,
    limit: 5000,
    fmtX:   (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
    fmtTip: (d) => d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    xLabel: 'Day',
  },
  '1M': {
    label: '1 Month',
    hours: 720,
    bucketMs: 5 * 24 * 60 * 60 * 1000,
    limit: 5000,
    fmtX:   (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    fmtTip: (d) => d.toLocaleDateString([], { month: 'long', day: 'numeric' }),
    xLabel: 'Date',
  },
};

/* ─── helpers ─────────────────────────────────────────────── */

// Builds a full 24-slot timeline for today (00:00 – 23:00).
// Every hour slot is present; value is null if no readings fell in that hour.
function buildDayTimeline(rows, metricKey) {
  const now      = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd   = new Date(dayStart.getTime() + 86_400_000);

  const buckets = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }));

  rows.forEach((row) => {
    const ts = row.recorded_at ? new Date(row.recorded_at) : null;
    if (!ts || ts < dayStart || ts >= dayEnd) return;
    const h   = ts.getHours();
    const val = metricKey === 'pm25' ? Number(row.pm25) : Number(row[metricKey]);
    if (!isNaN(val)) { buckets[h].sum += val; buckets[h].count++; }
  });

  return buckets.map(({ sum, count }, h) => ({
    time:    `${String(h).padStart(2, '0')}:00`,
    tipTime: `${String(h).padStart(2, '0')}:00 – ${String(h + 1).padStart(2, '0')}:00`,
    value:   count > 0 ? Math.round((sum / count) * 10) / 10 : null,
  }));
}

// Generic bucket average for 1W and 1M ranges.
function bucketAverage(rows, rcfg, metricKey) {
  if (!rows.length) return [];
  const map = {};
  rows.forEach((row) => {
    const ts  = row.recorded_at ? new Date(row.recorded_at).getTime() : null;
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

/* ─── component ───────────────────────────────────────────── */
export const LiveCharts = () => {
  const [metric,  setMetric]  = useState('co2');
  const [range,   setRange]   = useState('1D');
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(false);

  // Real-time reading from the store's Supabase subscription
  const liveReading  = useAppStore(state => state.liveReading);
  const prevLiveRef  = useRef(null);

  /* ── fetch historical data from Supabase ── */
  const fetchData = useCallback(async (r) => {
    setLoading(true);
    const rcfg = RANGES[r];

    // 1D: fetch from today's local midnight so buildDayTimeline has full context.
    // Others: rolling window.
    const since = r === '1D'
      ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })()
      : new Date(Date.now() - rcfg.hours * 3_600_000).toISOString();

    // Try recorded_at, then created_at, then fall back to id-only ordering
    for (const tsCol of ['recorded_at', 'created_at']) {
      const { data, error } = await supabase
        .from('air_quality')
        .select(`id, co2, pm25, pm1, pm4, pm10, temperature, humidity, ${tsCol}`)
        .gte(tsCol, since)
        .order(tsCol, { ascending: true })
        .limit(rcfg.limit);

      if (!error && data) {
        // Normalise whichever ts column we found to "recorded_at" so helpers work uniformly
        setRows(data.map(row => ({ ...row, recorded_at: row[tsCol] })));
        setLoading(false);
        return;
      }
    }

    // Last resort: no timestamp filter, order by id
    const { data: fallback } = await supabase
      .from('air_quality')
      .select('id, co2, pm25, pm1, pm4, pm10, temperature, humidity')
      .order('id', { ascending: false })
      .limit(rcfg.limit);
    if (fallback) setRows([...fallback].reverse());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  /* ── real-time: append new reading when store updates (1D only) ── */
  useEffect(() => {
    if (!liveReading || range !== '1D') return;
    if (prevLiveRef.current?.id === liveReading.id) return;
    prevLiveRef.current = liveReading;
    setRows(prev => {
      if (prev.some(r => r.id === liveReading.id)) return prev;
      return [...prev, {
        ...liveReading,
        // normalise: use whichever timestamp column the row has
        recorded_at: liveReading.recorded_at || liveReading.created_at || new Date().toISOString(),
      }];
    });
  }, [liveReading, range]);

  /* ── compute chart data ── */
  const data = useMemo(() => {
    if (range === '1D') return buildDayTimeline(rows, metric);
    return bucketAverage(rows, RANGES[range], metric);
  }, [rows, range, metric]);

  const mcfg = METRICS[metric];
  const rcfg = RANGES[range];

  // Latest non-null value for the header display
  const last = useMemo(() => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].value !== null) return data[i].value;
    }
    return null;
  }, [data]);

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

  /* ─── buttons ─── */
  const RangeBtn = ({ k }) => (
    <button
      onClick={() => setRange(k)}
      style={{
        padding: '5px 16px',
        borderRadius: 20,
        border: range === k ? '1.5px solid #2196f3' : '1.5px solid #e2e8f0',
        background: range === k ? '#2196f3' : '#fff',
        color: range === k ? '#fff' : '#64748b',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s',
        letterSpacing: '0.03em',
      }}
    >
      {RANGES[k].label}
    </button>
  );

  const MetricBtn = ({ k }) => (
    <button
      onClick={() => setMetric(k)}
      style={{
        padding: '4px 12px',
        borderRadius: 20,
        border: metric === k ? '1.5px solid #2196f3' : '1.5px solid #e2e8f0',
        background: metric === k ? '#eff6ff' : '#fff',
        color: metric === k ? '#2196f3' : '#94a3b8',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {METRICS[k].label}
    </button>
  );

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      padding: '24px 24px 16px',
      fontFamily: 'inherit',
      width: '100%',
    }}>

      {/* ── header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(RANGES).map(k => <RangeBtn key={k} k={k} />)}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.keys(METRICS).map(k => <MetricBtn key={k} k={k} />)}
          </div>
        </div>
      </div>

      {/* ── chart area ── */}
      <div style={{ width: '100%', height: 320 }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>

              <CartesianGrid
                stroke="#e2e8f0"
                strokeDasharray="0"
                strokeWidth={0.8}
                vertical={true}
                horizontal={true}
              />

              <XAxis
                dataKey="time"
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
                tickLine={{ stroke: '#1e293b', strokeWidth: 1.5 }}
                interval={range === '1D' ? 1 : 'preserveStartEnd'}
                angle={range === '1D' ? -45 : 0}
                textAnchor={range === '1D' ? 'end' : 'middle'}
                height={range === '1D' ? 48 : 36}
                label={range !== '1D' ? {
                  value: rcfg.xLabel,
                  position: 'insideBottom',
                  offset: -12,
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
                  value: `${mcfg.label} (${mcfg.unit})`,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 14,
                  style: { fill: '#1e293b', fontSize: 12, fontWeight: 700 },
                }}
              />

              <Tooltip
                content={<Tip />}
                cursor={{ stroke: '#2196f3', strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.6 }}
              />

              {mcfg.threshold && (
                <ReferenceLine
                  y={mcfg.threshold}
                  stroke="#ef4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `${mcfg.threshold} ${mcfg.unit}`,
                    fill: '#ef4444',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="value"
                stroke="#2196f3"
                strokeWidth={3}
                dot={{ r: 3, fill: '#2196f3', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2196f3', stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />

            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#cbd5e1' }}>
        <span>
          {range === '1D' ? '24-hour view · hourly averages' : range === '1W' ? 'Daily averages' : '5-day averages'}
          {' · '}{data.filter(d => d.value !== null).length} active points
        </span>
        <span>{range === '1D' ? '● Live — updates on new reading' : `Past ${rcfg.hours}h`}</span>
      </div>
    </div>
  );
};
