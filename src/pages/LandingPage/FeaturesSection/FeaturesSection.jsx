import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, LineChart, Bell, Download, Globe, Shield, Activity, Info } from 'lucide-react';
import { FeatureCard } from '../../../components/FeatureCard/FeatureCard';
import styles from './FeaturesSection.module.scss';
import './FeaturesSection.css';

const FEATURES = [
  { icon: Activity, title: 'Real-time Telemetry', description: 'Monitor PM1.0, PM2.5, PM4.0, PM10, CO₂, temperature, and humidity directly from ESP32 streaming channels.' },
  { icon: Info, title: 'Data-Driven Air Monitoring', description: 'Automated reporting for particulate matter, CO₂, temperature, and humidity with actionable alerts.' },
  { icon: Cpu, title: 'ESP32 Streaming Direct', description: 'Plug-and-play integration for local sensors utilizing Supabase real-time channels or standard WebSockets.' },
  { icon: LineChart, title: 'Comprehensive Analytics', description: 'Hourly, daily, and weekly averaging with beautiful multi-axis historical charts and anomaly highlights.' },
  { icon: Bell, title: 'Custom Threshold Alerts', description: 'Set actionable thresholds for pollutant and CO₂ metrics to keep indoor air quality within compliance bounds.' },
  { icon: Download, title: 'Data Export Suite', description: 'Download complete readings as formatted Excel spreadsheets (xlsx) or export branded PDF audit reports.' },
  { icon: Globe, title: '3D Environmental Visualizer', description: 'Cinematic 3D planetary rendering displaying interactive orbital streams, factories decay, and green restoration.' },
  { icon: Shield, title: 'Multi-Role Console Control', description: 'Separate Admin settings panels and Viewer dashboards secured with custom Supabase role authorization.' },
];

export const FeaturesSection = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Engineered for <span className={styles.highlight}>Atmospheric Intelligence</span>
          </h2>
          <p className={styles.subtitle}>
            Deploying localized monitoring networks to empower eco-friendly automation and global health analysis.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className={styles.grid}
        >
          {FEATURES.map((feature, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
