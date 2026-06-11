import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { LayoutDashboard, LineChart, Clock, FileText, Leaf } from 'lucide-react';
import styles from './Footer.module.scss';
import './Footer.css';

export const Footer = () => {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  // On landing page, show a clean minimal brand signature
  if (isLanding) {
    return (
      <footer className={styles.minimalFooter}>
        <div className={styles.minimalInner}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}></span>
            <span>ZyGreen</span>
          </div>
          <span className={styles.copy}>© {new Date().getFullYear()} ZyGreen. All rights reserved.</span>
        </div>
      </footer>
    );
  }

  // Floating dock sections
  const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard#graphs', icon: LineChart, label: 'Graphs' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/reports', icon: FileText, label: 'Reports' },
  ];

  return (
    <div className={styles.floatingDock}>
      <nav className={styles.dockNav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || 
                           (item.to === '/dashboard#graphs' && location.pathname === '/dashboard' && location.hash === '#graphs');
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={(e) => {
                if (item.to === '/dashboard#graphs' && location.pathname === '/dashboard') {
                  e.preventDefault();
                  const el = document.getElementById('graphs') || document.querySelector('[class*="analyticsSplit"]');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`${styles.dockLink} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.iconWrapper}>
                <Icon size={20} className={styles.icon} />
                <span className={styles.tooltip}>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
