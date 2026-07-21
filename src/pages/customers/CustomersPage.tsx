import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { KeyRound, Mail, MonitorSmartphone, MoreHorizontal, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { customerService } from '@/services/customerService';
import { useCustomerStore } from '@/store/customerStore';
import { useDebounce } from '@/hooks/useDebounce';
import { CreateCustomerDialog } from '@/features/customers/CreateCustomerDialog';
import { AssignDeviceDialog } from '@/features/customers/AssignDeviceDialog';
import { CredentialsDialog } from '@/features/customers/CredentialsDialog';
import { formatDate } from '@/utils/format';
import type { Customer, GeneratedCredentials } from '@/types';

export function CustomersPage() {
  const { search, setSearch } = useCustomerStore();
  const debouncedSearch = useDebounce(search, 250);
  const queryClient = useQueryClient();
  const [assignTarget, setAssignTarget] = useState<Customer | null>(null);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [resetTarget, setResetTarget] = useState<Customer | null>(null);

  const customersQuery = useQuery({
    queryKey: ['customers', debouncedSearch],
    queryFn: () => customerService.getCustomers(debouncedSearch),
  });

  const genCredsMutation = useMutation({
    mutationFn: customerService.generateCredentials,
    onSuccess: (creds) => setCredentials(creds),
    onError: () => toast.error('Failed to generate credentials'),
  });

  const resetPwMutation = useMutation({
    mutationFn: customerService.resetPassword,
    onSuccess: (creds) => setCredentials(creds),
    onError: () => toast.error('Failed to reset password'),
  });

  const inviteMutation = useMutation({
    mutationFn: customerService.sendInvitation,
    onSuccess: (res) => toast.success(`Invitation sent to ${res.sentTo}`),
    onError: () => toast.error('Failed to send invitation'),
  });

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.plan} Plan</p>
        </div>
      ),
    },
    {
      accessorKey: 'contactName',
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <p className="text-foreground">{row.original.contactName}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: 'deviceCount', header: 'Devices' },
    { accessorKey: 'userCount', header: 'Users' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant={row.original.status === 'Active' ? 'success' : 'muted'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'createdAt', header: 'Since', cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setAssignTarget(customer)}>
                <MonitorSmartphone className="h-3.5 w-3.5" />
                Assign Device
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => genCredsMutation.mutate(customer.id)}>
                <KeyRound className="h-3.5 w-3.5" />
                Generate Credentials
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => inviteMutation.mutate(customer.id)}>
                <Mail className="h-3.5 w-3.5" />
                Send Invitation
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setResetTarget(customer);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Password
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Manage customer organizations, their devices, and access credentials."
        actions={<CreateCustomerDialog />}
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={customersQuery.data ?? []}
            isLoading={customersQuery.isLoading}
            isError={customersQuery.isError}
            onRetry={() => customersQuery.refetch()}
            emptyTitle="No customers found"
            emptyDescription="Create your first customer to get started."
          />
        </CardContent>
      </Card>

      <AssignDeviceDialog customer={assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)} />
      <CredentialsDialog credentials={credentials} onOpenChange={(open) => !open && setCredentials(null)} />

      <ConfirmDialog
        trigger={<span className="hidden" />}
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        variant="default"
        title="Reset password?"
        description={`This will generate a new password for ${resetTarget?.name}. Their current password will stop working immediately.`}
        confirmLabel="Reset Password"
        onConfirm={() => {
          if (resetTarget) resetPwMutation.mutate(resetTarget.id);
          setResetTarget(null);
        }}
      />
    </div>
  );
}
