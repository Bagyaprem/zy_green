import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { userService } from '@/services/userService';
import { useUserStore } from '@/store/userStore';
import { useDebounce } from '@/hooks/useDebounce';
import { AddUserDialog } from '@/features/users/AddUserDialog';
import { EditUserDialog } from '@/features/users/EditUserDialog';
import { PermissionsPanel } from '@/features/users/PermissionsPanel';
import { USER_ROLE_OPTIONS } from '@/constants/options';
import { formatRelativeTime, initials } from '@/utils/format';
import type { AppUser } from '@/types';

export function UsersPage() {
  const { search, role, setSearch, setRole } = useUserStore();
  const debouncedSearch = useDebounce(search, 250);
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const usersQuery = useQuery({ queryKey: ['users', debouncedSearch], queryFn: () => userService.getUsers(debouncedSearch) });

  const filtered = useMemo(
    () => (usersQuery.data ?? []).filter((u) => role === 'all' || u.role === role),
    [usersQuery.data, role]
  );

  const toggleStatusMutation = useMutation({
    mutationFn: userService.toggleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User removed');
    },
    onError: () => toast.error('Failed to remove user'),
  });

  const columns: ColumnDef<AppUser>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ backgroundColor: `${row.original.avatarColor}22`, color: row.original.avatarColor }}>
              {initials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.customerName ?? 'ZYGREEN Internal'}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <button onClick={() => toggleStatusMutation.mutate(row.original.id)}>
          <Badge variant={row.original.status === 'Active' ? 'success' : 'muted'}>{row.original.status}</Badge>
        </button>
      ),
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelativeTime(row.original.lastLogin)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => setEditingUser(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger" title="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            title="Remove user?"
            description={`This will permanently remove ${row.original.name} from ZYGREEN. This action cannot be undone.`}
            confirmLabel="Remove"
            onConfirm={() => deleteMutation.mutate(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Manage platform users and their access roles." actions={<AddUserDialog />} />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="permissions">
            <ShieldCheck className="h-3.5 w-3.5" />
            Permissions Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {USER_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <DataTable
                columns={columns}
                data={filtered}
                isLoading={usersQuery.isLoading}
                isError={usersQuery.isError}
                onRetry={() => usersQuery.refetch()}
                emptyTitle="No users found"
                emptyDescription="Try adjusting your search or filters."
                enableColumnVisibility
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions Matrix</CardTitle>
              <CardDescription>What each role can see and do across the ZYGREEN admin console.</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditUserDialog user={editingUser} onOpenChange={(open) => !open && setEditingUser(null)} />
    </div>
  );
}
