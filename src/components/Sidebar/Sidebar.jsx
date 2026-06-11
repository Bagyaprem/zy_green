import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, BarChart3, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import styles from './Sidebar.module.scss';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/reports', icon: FileText, label: 'Reports' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.links}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={() => `${styles.link} ${location.pathname === to ? styles.active : ''}`}>
            <Icon size={20} className={styles.icon} />
            {!collapsed && <span className={styles.label}>{label}</span>}
          </NavLink>
        ))}
      </div>
      <button onClick={() => setCollapsed(!collapsed)} className={styles.toggleBtn}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
};
