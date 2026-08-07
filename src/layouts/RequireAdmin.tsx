import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Route guard for admin-only pages.
 *
 * ProtectedAdminLayout only checks that *someone* is signed in, never which
 * role — and the sidebar merely hides admin links from customers rather than
 * blocking the routes. So a logged-in customer who typed /customers or
 * /machines straight into the address bar got the full admin page, including
 * its working edit/delete row actions.
 *
 * This is the UX half of the fix. The security half is RLS: see
 * supabase_tenant_isolation.sql, which scopes every table to the caller's own
 * customer_id server-side. A guard here can always be bypassed (it's just
 * client JS); the database policies are what actually stop cross-tenant
 * reads and writes. Both exist on purpose — this one so customers get a
 * sensible redirect instead of a page of permission errors.
 */
export function RequireAdmin() {
  const { user, status } = useAuth();

  // Still resolving the session — ProtectedAdminLayout above is already
  // rendering a spinner, so render nothing rather than briefly redirecting a
  // user who turns out to be an admin.
  if (status === 'loading') return null;

  // customerId is non-null only for customers; admins have it as null.
  if (user?.customerId) return <Navigate to="/" replace />;

  return <Outlet />;
}
