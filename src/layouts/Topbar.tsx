import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, Moon, RotateCw, Search, Sun, User as UserIcon } from 'lucide-react';
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
import { initials } from '@/utils/format';
import { cn } from '@/lib/utils';

export function Topbar() {
  const { theme, toggleTheme, setMobileNavOpen } = useUiStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/machines?search=${encodeURIComponent(search.trim())}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 500);
    toast.success('Data refreshed');
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

      {!user?.customerId && (
        <form onSubmit={handleSearch} className="hidden max-w-sm flex-1 items-center sm:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machines..."
              className="pl-9"
            />
          </div>
        </form>
      )}

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
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback style={{ backgroundColor: `${user?.avatarColor ?? '#2E7D32'}22`, color: user?.avatarColor ?? '#2E7D32' }}>
                  {user?.name ? initials(user.name) : <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <p className="text-xs font-medium text-foreground">{user?.name ?? 'Admin'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-xs font-medium">{user?.name}</p>
              <p className="text-[11px] font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(user?.customerId ? '/account-settings' : '/profile')}>Profile</DropdownMenuItem>
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
