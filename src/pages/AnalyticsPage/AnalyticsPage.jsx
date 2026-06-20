import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../services/supabase';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf, ShieldAlert, Award } from 'lucide-react';
import styles from './AnalyticsPage.module.scss';
import './AnalyticsPage.css';

export const AnalyticsPage = () => {
  const { readings } = useAppStore();
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    const fetchMonthly = async () => {
      const since = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('air_quality')
        .select('co2, pm1, pm25, pm4, pm10, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(50000);

      if (error || !data) return;

      // Group by YYYY-MM-DD
      const byDay = {};
      data.forEach(row => {
        if (!row.created_at) return;
        const key = new Date(row.created_at).toISOString().slice(0, 10);
        if (!byDay[key]) byDay[key] = { co2: [], pm1: [], pm25: [], pm4: [], pm10: [] };
        if (!isNaN(row.co2))          byDay[key].co2.push(row.co2);
        if (!isNaN(Number(row.pm1)))  byDay[key].pm1.push(Number(row.pm1));
        if (!isNaN(Number(row.pm25))) byDay[key].pm25.push(Number(row.pm25));
        if (!isNaN(Number(row.pm4)))  byDay[key].pm4.push(Number(row.pm4));
        if (!isNaN(Number(row.pm10))) byDay[key].pm10.push(Number(row.pm10));
      });

      const avg = arr => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;

      // Build full 30-day scaffold — null for missing days
      const scaffold = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const entry = byDay[key];
        scaffold.push({
          name: label,
          CO2:   entry ? avg(entry.co2)  : null,
          PM1:   entry ? avg(entry.pm1)  : null,
          PM2_5: entry ? avg(entry.pm25) : null,
          PM4:   entry ? avg(entry.pm4)  : null,
          PM10:  entry ? avg(entry.pm10) : null,
        });
      }

      setDailyData(scaffold);
    };
    fetchMonthly();
  }, []);

  // Calculate statistics
  const totalReadings = readings.length;
  
  const avgCo2 = totalReadings > 0
    ? Math.round(readings.reduce((acc, curr) => acc + curr.co2, 0) / totalReadings)
    : 0;

  const avgPm25 = totalReadings > 0
    ? Math.round(readings.reduce((acc, curr) => acc + Number(curr.pm25), 0) / totalReadings * 10) / 10
    : 0;

  const peakCo2 = totalReadings > 0
    ? Math.max(...readings.map(item => item.co2))
    : 0;

  const maxPm25 = totalReadings > 0
    ? Math.max(...readings.map(item => Number(item.pm25)))
    : 0;

  // Recommendations generator
  const getInsights = () => {
    const insightsList = [];
    if (avgCo2 <= 800) {
      insightsList.push({
        title: 'Fresh CO₂ Levels',
        desc: `Average weekly CO₂ is ${avgCo2} ppm, indicating effective ventilation and healthy ambient air.`,
        type: 'good',
        icon: Award
      });
    } else {
      insightsList.push({
        title: 'CO₂ levels are elevated',
        desc: `Average weekly CO₂ is ${avgCo2} ppm. Increase fresh air circulation and reduce enclosed occupancy where possible.`,
        type: 'warning',
        icon: Leaf
      });
    }

    if (avgCo2 > 800) {
      insightsList.push({
        title: 'High CO₂ Saturation',
        desc: `Average indoor CO₂ is ${avgCo2} ppm. This level of carbon build-up causes minor fatigue. Ensure active ventilation flows.`,
        type: 'critical',
        icon: ShieldAlert
      });
    } else {
      insightsList.push({
        title: 'Fresh Air Circulation',
        desc: `Average CO₂ levels are at ${avgCo2} ppm, indicating clean active ventilation systems.`,
        type: 'good',
        icon: Leaf
      });
    }

    return insightsList;
  };

  const insights = getInsights();

  return (
    <div className={styles.workspace}>
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Environmental Analytics</h1>
            <p className={styles.subtitle}>Detailed historical patterns and automated health assessments</p>
          </div>
        </div>

        {/* Analytics Top Cards */}
        <div className={styles.statsGrid}>
              <div className={styles.statCard}>
            <span className={styles.statLabel}>Average CO₂ Level</span>
            <span className={styles.statVal}>{avgCo2} <span className={styles.unit}>ppm</span></span>
            <span className={styles.statSub}>Target: &lt; 800 ppm</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Peak CO₂ Level</span>
            <span className={styles.statVal}>{peakCo2} <span className={styles.unit}>ppm</span></span>
            <span className={styles.statSub}>Max recorded this week</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Average PM2.5</span>
            <span className={styles.statVal}>{avgPm25} <span className={styles.unit}>µg</span></span>
            <span className={styles.statSub}>Hourly average</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Peak PM2.5</span>
            <span className={styles.statVal}>{maxPm25} <span className={styles.unit}>µg</span></span>
            <span className={styles.statSub}>Highest recorded peak</span>
          </div>
        </div>

        {/* Insights & Chart rows */}
        <div className={styles.analyticsBody}>
          <div className={styles.chartCol}>
            <div className={styles.chartCard}>
              <h3 className={styles.cardTitle}>Daily Average CO₂ (Last 30 Days)</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => value === null ? ['No data', 'CO₂'] : [`${value} ppm`, 'CO₂']}
                    />
                    <Bar dataKey="CO2" fill="#ef4444" radius={[4, 4, 0, 0]} minPointSize={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.chartCard} style={{ marginTop: '16px' }}>
              <h3 className={styles.cardTitle}>Daily Average Particulate Matter (Last 30 Days)</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} interval={4} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit=" µg" />
                    <Tooltip
                      cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value, name) => value === null ? ['No data', name] : [`${value} µg/m³`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }} />
                    <Line dataKey="PM1"   name="PM1.0"  stroke="#22c55e" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line dataKey="PM2_5" name="PM2.5"  stroke="#eab308" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line dataKey="PM4"   name="PM4.0"  stroke="#f97316" strokeWidth={2} dot={false} connectNulls={false} />
                    <Line dataKey="PM10"  name="PM10"   stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights panel */}
          <div className={styles.insightsCol}>
            <div className={styles.insightsCard}>
              <h3 className={styles.cardTitle}>AI Environmental Insights</h3>
              <div className={styles.insightsList}>
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  return (
                    <div key={idx} className={`${styles.insightItem} ${styles[insight.type]}`}>
                      <div className={styles.insightHeader}>
                        <Icon size={18} className={styles.insightIcon} />
                        <h4 className={styles.insightTitle}>{insight.title}</h4>
                      </div>
                      <p className={styles.insightDesc}>{insight.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
