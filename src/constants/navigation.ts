import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Cpu,
  Radio,
  BarChart3,
  History,
  FileText,
  BellRing,
  Building2,
  Users,
  UploadCloud,
  Settings,
  ScrollText,
  LogOut,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { label: 'Devices', path: '/devices', icon: Cpu },
  { label: 'Live Monitoring', path: '/live-monitoring', icon: Radio },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Data History', path: '/data-history', icon: History },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Alerts', path: '/alerts', icon: BellRing },
  { label: 'Customers', path: '/customers', icon: Building2 },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Firmware', path: '/firmware', icon: UploadCloud },
  { label: 'Settings', path: '/settings', icon: Settings },
  { label: 'Activity Logs', path: '/activity-logs', icon: ScrollText },
];

export const logoutNavItem: NavItem = { label: 'Logout', path: '/logout', icon: LogOut };
