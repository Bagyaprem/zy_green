import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { SensorCard } from '../../components/SensorCard/SensorCard';
import { LiveCharts } from '../../components/LiveCharts/LiveCharts';
import { Wind, Activity, CloudRain, Cloud, Flame, Thermometer, Droplets } from 'lucide-react';
import styles from './DashboardPage.module.scss';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { readings, liveReading } = useAppStore();

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
