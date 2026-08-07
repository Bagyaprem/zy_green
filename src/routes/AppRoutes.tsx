import { Routes, Route } from 'react-router-dom';
import { ProtectedAdminLayout } from '@/layouts/ProtectedAdminLayout';
import { RequireAdmin } from '@/layouts/RequireAdmin';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CustomerDashboardPage } from '@/pages/dashboard/CustomerDashboardPage';
import { MachinesPage } from '@/pages/machines/MachinesPage';
import { MachineDetailsPage } from '@/pages/machines/MachineDetailsPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { LiveDataPage } from '@/pages/live-data/LiveDataPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { DownloadsPage } from '@/pages/downloads/DownloadsPage';
import { ActivityLogsPage } from '@/pages/activity-logs/ActivityLogsPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { AccountSettingsPage } from '@/pages/account-settings/AccountSettingsPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { useAuth } from '@/hooks/useAuth';

function DashboardRoute() {
  const { user } = useAuth();
  return user?.customerId ? <CustomerDashboardPage /> : <DashboardPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedAdminLayout />}>
        {/* Shared: both roles, each seeing only their own scope. */}
        <Route path="/" element={<DashboardRoute />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Customer portal pages. Admins may also open these (a superset is
            harmless); the reverse is not, hence RequireAdmin below. */}
        <Route path="/live-data" element={<LiveDataPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/account-settings" element={<AccountSettingsPage />} />

        {/* Admin-only: fleet-wide management with destructive row actions.
            Hiding these from the sidebar was never enough - the routes
            themselves have to reject customers. */}
        <Route element={<RequireAdmin />}>
          <Route path="/machines" element={<MachinesPage />} />
          <Route path="/machines/:machineId" element={<MachineDetailsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/activity-logs" element={<ActivityLogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
