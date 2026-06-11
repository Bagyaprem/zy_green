import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldAlert, TrendingUp, Cpu, Leaf } from 'lucide-react';
import styles from './PreviewSection.module.scss';
import './PreviewSection.css';

export const PreviewSection = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.tag}>
            <TrendingUp size={14} className={styles.tagIcon} />
            <span>Interactive Simulator Console</span>
          </div>
          <h2 className={styles.title}>
            Operational Control at your <span className={styles.highlight}>Fingertips</span>
          </h2>
          <p className={styles.description}>
            Log into the console workspace to explore historical graphs, download air compliance audits, register physical sensor hardware (ESP32), and adjust custom hazard thresholds.
          </p>
          <div className={styles.ctaGroup}>
            <Link to="/login" className={styles.primaryBtn}>
              Enter Workspace
            </Link>
            <a href="#restoration-scroll" className={styles.secondaryBtn} onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}>
              Scroll to Earth
            </a>
          </div>
        </div>

        <div className={styles.preview}>
          {/* Simulated Console Screen */}
          <div className={styles.consoleScreen}>
            <div className={styles.consoleHeader}>
              <div className={styles.windowControls}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.consoleTitle}>
                console_preview_v1.0.js
              </div>
              <div className={styles.statusBadge}>
                <span className={styles.pingDot} />
                LIVE
              </div>
            </div>

            <div className={styles.consoleBody}>
              {/* Telemetry Row */}
              <div className={styles.telemetryGrid}>
                <div className={styles.telemetryCard} style={{ '--card-glow': '#22c55e' }}>
                  <div className={styles.telemetryLabel}>
                    <Leaf size={14} className={styles.cardIconGreen} />
                    <span>PM2.5</span>
                  </div>
                  <div className={styles.telemetryVal}>18.2 <span className={styles.unit}>µg</span></div>
                  <div className={styles.telemetrySub}>Within Safe Limits</div>
                </div>

                <div className={styles.telemetryCard} style={{ '--card-glow': '#ef4444' }}>
                  <div className={styles.telemetryLabel}>
                    <ShieldAlert size={14} className={styles.cardIconRed} />
                    <span>CO₂ Level</span>
                  </div>
                  <div className={styles.telemetryVal}>412 <span className={styles.unit}>ppm</span></div>
                  <div className={styles.telemetrySub}>Optimal Ventilation</div>
                </div>

                <div className={styles.telemetryCard} style={{ '--card-glow': '#0ea5e9' }}>
                  <div className={styles.telemetryLabel}>
                    <Cpu size={14} className={styles.cardIconBlue} />
                    <span>Temp</span>
                  </div>
                  <div className={styles.telemetryVal}>24.8 <span className={styles.unit}>°C</span></div>
                  <div className={styles.telemetrySub}>Comfort-controlled indoor climate</div>
                </div>
              </div>

              {/* Chart simulation */}
              <div className={styles.chartArea}>
                <div className={styles.chartTitle}>Historical CO₂ Trend (Hourly)</div>
                <div className={styles.svgContainer}>
                  <svg viewBox="0 0 400 120" className={styles.chartSvg}>
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="0" y1="30" x2="400" y2="30" stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1="0" y1="65" x2="400" y2="65" stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="#f1f5f9" strokeWidth="0.5" />
                    {/* Path area */}
                    <path
                      d="M0,80 Q50,40 100,60 T200,90 T300,50 T400,30 L400,120 L0,120 Z"
                      fill="url(#chartGlow)"
                    />
                    {/* Path line */}
                    <path
                      d="M0,80 Q50,40 100,60 T200,90 T300,50 T400,30"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      className={styles.chartPath}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
