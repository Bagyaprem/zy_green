import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import styles from './HeroSection.module.scss';
import './HeroSection.css';

export const HeroSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.8 }}
        className={styles.scrollIndicator}
      >
        <span className={styles.bounceLabel}>Scroll to restore Earth</span>
        <ChevronDown className={styles.bounceArrow} size={20} />
      </motion.div>
      </div>
    </section>
  );
};
