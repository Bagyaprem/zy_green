import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import styles from './Navbar.module.scss';
import './Navbar.css';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/dashboard#graphs', label: 'Graphs', isHash: true },
    { to: '/reports', label: 'Reports' },
    { to: '/history', label: 'History' }
  ];

  const handleHashLink = (e, to) => {
    if (to === '/dashboard#graphs' && location.pathname === '/dashboard') {
      e.preventDefault();
      // Scroll to chart splitting element
      const el = document.getElementById('graphs') || document.querySelector('[class*="analyticsSplit"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className={`${styles.navbar} ${isLanding ? styles.light : styles.dark}`}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <img src="/logo.png" alt="ZyGreen logo" className={styles.logoIcon} />
          <div className={styles.logoTextBlock}>
            <span className={styles.logoText}>ZyGreen</span>
            <span className={styles.logoSubtitle}>Sustainable Innovation for a Better Tomorrow</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className={styles.desktopLinks}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => link.isHash && handleHashLink(e, link.to)}
              className={styles.navLink}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu trigger */}
        <div className={styles.mobileActions}>
          <button onClick={() => setIsOpen(!isOpen)} className={styles.iconBtn}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Links */}
      {isOpen && (
        <div className={`${styles.mobileMenu} ${isLanding ? styles.light : styles.dark}`}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={(e) => {
                setIsOpen(false);
                if (link.isHash) handleHashLink(e, link.to);
              }}
              className={styles.mobileLink}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};
