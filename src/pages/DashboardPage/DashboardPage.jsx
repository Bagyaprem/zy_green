import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SensorCard } from '../../components/SensorCard/SensorCard';
import { LiveCharts } from '../../components/LiveCharts/LiveCharts';
import { Wind, Activity, CloudRain, Cloud, Flame, Thermometer, Droplets, Cpu } from 'lucide-react';
import styles from './DashboardPage.module.scss';
import './DashboardPage.css';

/* ── Device online/offline logic: live = last reading within 10 min ── */
function useDeviceStatus(liveReading, readings) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const lastRow = liveReading || readings[readings.length - 1];
  const lastTs  = lastRow?.recorded_at || lastRow?.created_at;
  const lastMs  = lastTs ? new Date(lastTs).getTime() : null;
  const ageMs   = lastMs ? now - lastMs : null;
  const isLive  = ageMs !== null && ageMs < 10 * 60 * 1000;

  let lastSeenLabel = 'No data';
  if (ageMs !== null) {
    const mins = Math.floor(ageMs / 60_000);
    lastSeenLabel = mins < 1 ? 'Just now' : `${mins} min ago`;
  }

  return { isLive, lastSeenLabel };
}

export const DashboardPage = () => {
  const { readings, liveReading } = useAppStore();
  const { isLive, lastSeenLabel } = useDeviceStatus(liveReading, readings);

  // Use liveReading if available, otherwise fallback to last reading in history
  const activeReading = liveReading || readings[readings.length - 1] || {
    pm1: 12, pm25: 18, pm4: 20, pm10: 24, co2: 412, temperature: 24.5, humidity: 55
  };

  const pm25Val = Number(activeReading.pm25);
  const cardsData = [
    { icon: Flame, title: 'CO₂ Levels', value: activeReading.co2, unit: 'ppm', status: activeReading.co2 > 1000 ? 'Critical' : 'Safe', statusColor: activeReading.co2 > 1000 ? '#f97316' : '#22c55e', desc: 'Ventilation threshold' },
    { icon: Activity, title: 'PM2.5 Conc.', value: pm25Val, unit: 'µg', status: pm25Val > 35 ? 'Warning' : 'Excellent', statusColor: pm25Val > 35 ? '#eab308' : '#22c55e', desc: 'Fine dust particulates' },
    { icon: Wind, title: 'PM1.0 Conc.', value: Number(activeReading.pm1), unit: 'µg', status: 'Optimal', statusColor: '#0ea5e9', desc: 'Ultra-fine dust particles' },
    { icon: CloudRain, title: 'PM4.0 Conc.', value: Number(activeReading.pm4), unit: 'µg', status: 'Normal', statusColor: '#0ea5e9', desc: 'Medium particulates' },
    { icon: Cloud, title: 'PM10 Conc.', value: activeReading.pm10, unit: 'µg', status: 'Safe', statusColor: '#0ea5e9', desc: 'Coarse dust particulates' },
    { icon: Thermometer, title: 'Temperature', value: activeReading.temperature, unit: '°C', status: 'Stable', statusColor: '#0ea5e9', desc: 'Ambient indoor air' },
    { icon: Droplets, title: 'Humidity', value: activeReading.humidity, unit: '%', status: 'Normal', statusColor: '#0ea5e9', desc: 'Atmospheric dampness' },
  ];

  return (
    <div className={styles.workspace}>
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Environmental Console</h1>
            <p className={styles.subtitle}>Real-time telemetry reports directly from localized monitoring points</p>
          </div>

          {/* Device status badge */}
          <div className={styles.deviceBadge} style={{
            background: isLive ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${isLive ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <Cpu size={15} color={isLive ? '#16a34a' : '#dc2626'} />
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Air Quality Monitor · Machine 1</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontWeight: 700,
              fontSize: 11,
              color: isLive ? '#16a34a' : '#dc2626',
              background: isLive ? '#dcfce7' : '#fee2e2',
              borderRadius: 20,
              padding: '2px 10px',
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLive ? '#22c55e' : '#ef4444',
                display: 'inline-block',
                animation: isLive ? 'glow-pulse 1.4s ease-in-out infinite alternate' : 'none',
              }} />
              {isLive ? 'Live' : 'Offline'}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>
              {lastSeenLabel}
            </span>
          </div>
        </div>

        {/* Telemetry Cards Row */}
        <div className={styles.cardsGrid}>
          {cardsData.map((card, index) => (
            <SensorCard key={index} {...card} />
          ))}
        </div>

        {/* Chart split */}
        <div className={styles.analyticsSplit}>
          <div className={styles.chartCol}>
            <LiveCharts />
          </div>
        </div>
      </main>
    </div>
  );
};
