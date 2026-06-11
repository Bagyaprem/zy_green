import React, { useState, useEffect } from 'react';
import { EarthCanvas } from './EarthScene/EarthScene';
import { HeroSection } from './HeroSection/HeroSection';
import { TransformSection } from './TransformSection/TransformSection';
import { BrandSection } from './BrandSection/BrandSection';
import { DashboardSection } from './DashboardSection/DashboardSection';
import styles from './LandingPage.module.scss';
import './LandingPage.css';

export const LandingPage = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollRange = window.innerHeight * 2.0; // Adjust range to smooth transition
      const progress = Math.min(1, Math.max(0, scrollTop / scrollRange));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    // Initial call
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sloganVisible = scrollProgress > 0.28;

  return (
    <div className={styles.landingPage}>
      {/* 3D Cinematic Scroll Stage */}
      <div className={styles.scrollContainer}>
        {/* Sticky 3D Globe Backdrop */}
        <div className={styles.stickyStage}>
          <EarthCanvas scrollProgress={scrollProgress} />
          <div className={`${styles.globeSlogan} ${sloganVisible ? styles.visible : ''}`}>
            Sustainable Innovation for a Better Tomorrow
          </div>
        </div>

        {/* Scroll overlay wrappers */}
        <div className={styles.sectionsOverlay}>
          {/* Section 1: Empty Hero Spacer (only scroll hint at bottom) */}
          <HeroSection />

          {/* Section 2: Empty Restoration Spacer */}
          <TransformSection />

          {/* Section 3: Brand Reveal */}
          <BrandSection />
        </div>
      </div>

      {/* Section 4: Live Telemetry Dashboard */}
      <DashboardSection />
    </div>
  );
};
