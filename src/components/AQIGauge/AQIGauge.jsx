import React from 'react';
import { getAQIDetails } from '../../utils/aqi';
import styles from './AQIGauge.module.scss';
import './AQIGauge.css';

export const AQIGauge = ({ value }) => {
  const details = getAQIDetails(value);
  
  // AQI max is 500
  const maxAQI = 500;
  const percentage = Math.min(100, (value / maxAQI) * 100);
  
  // Circumference of SVG circle of radius 50: 2 * Math.PI * 50 = 314.16
  const circumference = 314.16;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={styles.gaugeContainer}>
      <h3 className={styles.title}>Real-time AQI Index</h3>
      
      <div className={styles.svgWrapper}>
        <svg viewBox="0 0 120 120" className={styles.gaugeSvg}>
          {/* Background circle track */}
          <circle
            cx="60"
            cy="60"
            r="50"
            className={styles.track}
          />
          {/* Active colored arc indicating AQI percentage */}
          <circle
            cx="60"
            cy="60"
            r="50"
            className={styles.indicator}
            style={{
              stroke: details.hex,
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        
        {/* Center label readings */}
        <div className={styles.centerLabel}>
          <span className={styles.aqiNum} style={{ color: details.hex }}>
            {value}
          </span>
          <span className={styles.labelTitle} style={{ color: details.hex }}>
            {details.label}
          </span>
        </div>
      </div>
      
      <div className={styles.description}>
        <p className={styles.descText}>{details.description}</p>
        <div className={styles.advice}>
          <h4>Health Recommendations:</h4>
          <ul>
            {details.advice.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
