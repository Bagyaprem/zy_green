import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaf, ShieldAlert, Award, FileText, ArrowRight } from 'lucide-react';
import styles from './AnalyticsPage.module.scss';
import './AnalyticsPage.css';

export const AnalyticsPage = () => {
  const { readings } = useAppStore();

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

  // Generate 7-day average simulator dataset for Recharts
  const dailyData = [
    { name: 'Mon', CO2: Math.max(300, Math.round(avgCo2 * 0.9)) },
    { name: 'Tue', CO2: Math.max(300, Math.round(avgCo2 * 0.98)) },
    { name: 'Wed', CO2: Math.max(300, Math.round(avgCo2 * 1.1)) },
    { name: 'Thu', CO2: Math.max(300, Math.round(avgCo2 * 0.95)) },
    { name: 'Fri', CO2: Math.max(300, Math.round(avgCo2 * 1.02)) },
    { name: 'Sat', CO2: Math.max(300, Math.round(avgCo2 * 0.85)) },
    { name: 'Sun', CO2: avgCo2 },
  ];

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
              <h3 className={styles.cardTitle}>Daily Average Indices</h3>
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
