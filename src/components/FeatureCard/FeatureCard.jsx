import React from 'react';
import styles from './FeatureCard.module.scss';
import './FeatureCard.css';

export const FeatureCard = ({ icon: Icon, title, description }) => {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>
        <Icon size={24} className={styles.icon} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </div>
  );
};
