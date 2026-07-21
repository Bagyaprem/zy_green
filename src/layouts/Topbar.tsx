import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Menu, Moon, RotateCw, Search, Sun, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LiveClock } from '@/components/shared/LiveClock';
import { useUiStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { notificationService } from '@/services/notificationService';
import { formatRelativeTime, initials } from '@/utils/format';
import { AlertSeverityBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

export function Topbar() {
  const { theme, toggleTheme, setMobileNavOpen } = useUiStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
    refetchInterval: 30000,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/devices?search=${encodeURIComponent(search.trim())}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 500);
    toast.success('Data refreshed');
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      <form onSubmit={handleSearch} className="hidden max-w-sm flex-1 items-center sm:flex">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devices, customers, alerts..."
            className="pl-9"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <LiveClock />

        <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh data">
          <RotateCw className={cn('h-4.5 w-4.5', refreshing && 'animate-spin')} />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle dark mode">
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger ring-2 ring-card" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No notifications yet</p>
              )}
              {notifications.slice(0, 8).map((n) => (
                <DropdownMenuItem key={n.id} className={cn('flex-col items-start gap-1 py-2', !n.read && 'bg-accent/50')}>
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{n.title}</span>
                    <AlertSeverityBadge severity={n.severity} />
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/alerts')} className="justify-center text-xs font-medium text-primary">
              View all alerts
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback style={{ backgroundColor: `${user?.avatarColor ?? '#2E7D32'}22`, color: user?.avatarColor ?? '#2E7D32' }}>
                  {user?.name ? initials(user.name) : <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <p className="text-xs font-medium text-foreground">{user?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground">{user?.role ?? 'Super Admin'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-xs font-medium">{user?.name}</p>
              <p className="text-[11px] font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/activity-logs')}>Activity Logs</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-danger focus:text-danger">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
