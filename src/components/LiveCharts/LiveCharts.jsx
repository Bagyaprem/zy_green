import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { supabase } from '../../services/supabase';
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
    bucketMs: 60 * 60 * 1000,           // 1-hour gap → 24 pts
    limit: 5000,
    fmtX:   (d) => `${String(d.getHours()).padStart(2,'0')}:00`,
    fmtTip: (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    xLabel: 'Time (hours)',
  },
  '1W': {
    label: '1 Week',
    hours: 168,
    bucketMs: 24 * 60 * 60 * 1000,      // 1-day gap → 7 pts
    limit: 5000,
    fmtX:   (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }),
    fmtTip: (d) => d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    xLabel: 'Day',
  },
  '1M': {
    label: '1 Month',
    hours: 720,
    bucketMs: 5 * 24 * 60 * 60 * 1000,  // 5-day gap → ~6 pts
    limit: 5000,
    fmtX:   (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    fmtTip: (d) => d.toLocaleDateString([], { month: 'long', day: 'numeric' }),
    xLabel: 'Date',
  },
};

/* ─── helpers ─────────────────────────────────────────────── */
function bucketAverage(rows, rcfg, metricKey) {
  if (!rows.length) return [];
  const map = {};
  rows.forEach((row) => {
    const ts  = row.created_at ? new Date(row.created_at).getTime() : row.id * 10_000;
    const key = Math.floor(ts / rcfg.bucketMs) * rcfg.bucketMs;
    if (!map[key]) map[key] = { sum: 0, count: 0 };
    const val = metricKey === 'pm25' ? Number(row.pm25) : Number(row[metricKey]);
    if (!isNaN(val)) { map[key].sum += val; map[key].count += 1; }
  });
  return Object.entries(map)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([bucket, { sum, count }]) => ({
      bucketDate: new Date(Number(bucket)),
      time:       rcfg.fmtX(new Date(Number(bucket))),
      tipTime:    rcfg.fmtTip(new Date(Number(bucket))),
      value:      Math.round((sum / count) * 10) / 10,
    }));
}

/* ─── component ───────────────────────────────────────────── */
export const LiveCharts = () => {
  const [metric,  setMetric]  = useState('co2');
  const [range,   setRange]   = useState('1D');
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [noTs,    setNoTs]    = useState(false);

  const fetchData = useCallback(async (r, m) => {
    setLoading(true);
    const rcfg  = RANGES[r];
    const since = new Date(Date.now() - rcfg.hours * 3_600_000).toISOString();

    let { data: rows, error } = await supabase
      .from('air_quality')
      .select('id, co2, pm25, temperature, humidity, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(rcfg.limit);

    if (error && error.message.includes('created_at')) {
      setNoTs(true);
      ({ data: rows, error } = await supabase
        .from('air_quality')
        .select('id, co2, pm25, temperature, humidity')
        .order('id', { ascending: false })
        .limit(rcfg.limit));
      if (!error) rows = [...(rows || [])].reverse();
    } else {
      setNoTs(false);
    }

    if (!error && rows) setData(bucketAverage(rows, rcfg, m));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(range, metric); }, [range, metric, fetchData]);

  useEffect(() => {
    if (range !== '1D') return;
    const id = setInterval(() => fetchData('1D', metric), 60_000);
    return () => clearInterval(id);
  }, [range, metric, fetchData]);

  const mcfg = METRICS[metric];
  const rcfg = RANGES[range];
  const last = data.length ? data[data.length - 1].value : null;

  /* tooltip */
  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const pt = payload[0].payload;
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

  /* ─── range / metric pill buttons ─── */
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

      {noTs && (
        <p style={{ margin: '0 0 12px', fontSize: 11, color: '#f97316', background: '#fff7ed', padding: '6px 10px', borderRadius: 6, border: '1px solid #fed7aa' }}>
          ⚠ Run <code style={{ background: '#fef3c7', padding: '1px 4px', borderRadius: 3 }}>ALTER TABLE air_quality ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();</code> in Supabase.
        </p>
      )}

      {/* ── chart area ── */}
      <div style={{ width: '100%', height: 320 }}>
        {loading ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            No data for this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>

              {/* fine grid like graph paper */}
              <CartesianGrid
                stroke="#e2e8f0"
                strokeDasharray="0"
                strokeWidth={0.8}
                vertical={true}
                horizontal={true}
              />

              {/* bottom X axis — bold black line */}
              <XAxis
                dataKey="time"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: '#1e293b', strokeWidth: 2 }}
                tickLine={{ stroke: '#1e293b', strokeWidth: 1.5 }}
                interval="preserveStartEnd"
                label={{
                  value: rcfg.xLabel,
                  position: 'insideBottom',
                  offset: -12,
                  style: { fill: '#1e293b', fontSize: 12, fontWeight: 700 },
                }}
              />

              {/* left Y axis — bold black line */}
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

              {/* the smooth S-curve line */}
              <Line
                type="natural"
                dataKey="value"
                stroke="#2196f3"
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 6, fill: '#2196f3', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-in-out"
              />

            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── footer ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#cbd5e1' }}>
        <span>
          {range === '1D' ? '1-hour intervals' : range === '1W' ? 'Daily averages' : '5-day averages'}
          {' · '}{data.length} points
        </span>
        <span>{range === '1D' ? 'Auto-refresh: 60s' : `Past ${rcfg.hours}h`}</span>
      </div>
    </div>
  );
};
