import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Sidebar, MobileSidebar } from '@/layouts/Sidebar';
import { Topbar } from '@/layouts/Topbar';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedAdminLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
