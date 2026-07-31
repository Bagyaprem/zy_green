import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Cpu,
  Building2,
  FileText,
  ScrollText,
  UserCircle,
  Settings,
  Radio,
  BarChart3,
  Download,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

/** Admin console navigation — full fleet/customer management. */
export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { label: 'Machine Management', path: '/machines', icon: Cpu },
  { label: 'Customer Management', path: '/customers', icon: Building2 },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Activity Logs', path: '/activity-logs', icon: ScrollText },
  { label: 'Profile', path: '/profile', icon: UserCircle },
];

/** Customer portal navigation — view-only, scoped to their own machines by RLS. */
export const customerNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { label: 'Live Data', path: '/live-data', icon: Radio },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Downloads', path: '/downloads', icon: Download },
  { label: 'Account Settings', path: '/account-settings', icon: Settings },
];
