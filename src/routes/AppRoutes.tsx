import { Routes, Route } from 'react-router-dom';
import { ProtectedAdminLayout } from '@/layouts/ProtectedAdminLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { DevicesPage } from '@/pages/devices/DevicesPage';
import { DeviceDetailsPage } from '@/pages/devices/DeviceDetailsPage';
import { LiveMonitoringPage } from '@/pages/live-monitoring/LiveMonitoringPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { DataHistoryPage } from '@/pages/data-history/DataHistoryPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { AlertsPage } from '@/pages/alerts/AlertsPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { FirmwarePage } from '@/pages/firmware/FirmwarePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { ActivityLogsPage } from '@/pages/activity-logs/ActivityLogsPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedAdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:deviceId" element={<DeviceDetailsPage />} />
        <Route path="/live-monitoring" element={<LiveMonitoringPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/data-history" element={<DataHistoryPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/firmware" element={<FirmwarePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/activity-logs" element={<ActivityLogsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
