import React from 'react';
import { motion } from 'framer-motion';
import styles from './SensorCard.module.scss';
import './SensorCard.css';

export const SensorCard = ({ icon: Icon, title, value, unit, status, statusColor, desc }) => {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={styles.card}
      style={{ '--status-color': statusColor }}
    >
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <div className={styles.iconWrapper}>
          <Icon size={18} />
        </div>
      </div>
      
      <div className={styles.body}>
        <span className={styles.value}>
          {value} <span className={styles.unit}>{unit}</span>
        </span>
      </div>

      <div className={styles.footer}>
        <span className={styles.statusDot} />
        <span className={styles.statusText}>{status}</span>
        <span className={styles.desc}>• {desc}</span>
      </div>
    </motion.div>
  );
};
