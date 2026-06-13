import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaf, ShieldAlert, Award } from 'lucide-react';
import styles from './AnalyticsPage.module.scss';
import './AnalyticsPage.css';

export const AnalyticsPage = () => {
  const { readings } = useAppStore();
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    const fetchWeekly = async () => {
      const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
      const { data, error } = await supabase
        .from('air_quality')
        .select('co2, recorded_at')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
        .limit(10000);

      if (error || !data) return;

      // Group by calendar day
      const byDay = {};
      data.forEach(row => {
        if (!row.recorded_at) return;
        const d   = new Date(row.recorded_at);
        const key = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
        if (!byDay[key]) byDay[key] = { sum: 0, count: 0 };
        if (!isNaN(row.co2)) { byDay[key].sum += row.co2; byDay[key].count++; }
      });

      setDailyData(
        Object.entries(byDay).map(([name, { sum, count }]) => ({
          name,
          CO2: count > 0 ? Math.round(sum / count) : 0,
        }))
      );
    };
    fetchWeekly();
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
              <h3 className={styles.cardTitle}>Daily Average CO₂ (Last 7 Days)</h3>
              <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="CO2" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
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
