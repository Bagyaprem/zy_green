import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { navItems, customerNavItems } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { useUiStore } from '@/store/uiStore';
import { AnimatePresence, motion } from 'framer-motion';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const visibleNavItems = user?.customerId ? customerNavItems : navItems;

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success('Logged out successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logout request failed; clearing local session anyway.');
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <img src="/logo.png" alt="ZYGREEN" className="h-8 w-8 shrink-0 rounded-full" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">ZYGREEN</p>
          <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
            {user?.customerId ? 'Air Quality Monitoring' : 'Admin Console'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 no-scrollbar">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-active/60 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-active/60 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <AnimatePresence>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="absolute inset-y-0 left-0 w-64"
          >
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="absolute right-3 top-4 z-10 text-sidebar-foreground/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
