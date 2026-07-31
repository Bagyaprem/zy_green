import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
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
import { EditCustomerDialog } from '@/features/customers/EditCustomerDialog';
import { CustomerDetailsDialog } from '@/features/customers/CustomerDetailsDialog';
import { formatDate } from '@/utils/format';
import type { Customer } from '@/types';

export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const { search, setSearch } = useCustomerStore();
  const debouncedSearch = useDebounce(search, 250);
  const queryClient = useQueryClient();
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customersQuery = useQuery({
    queryKey: ['customers', debouncedSearch],
    queryFn: () => customerService.getCustomers(debouncedSearch),
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-lite'] });
      toast.success('Customer deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete customer'),
  });

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: 'customerName',
      header: 'Customer Name',
      cell: ({ row }) => <p className="font-medium text-foreground">{row.original.customerName}</p>,
    },
    { accessorKey: 'companyName', header: 'Company', cell: ({ row }) => row.original.companyName || '-' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || '-' },
    { accessorKey: 'machineCount', header: 'Total Machines' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant={row.original.status === 'Active' ? 'success' : 'muted'}>{row.original.status}</Badge>,
    },
    { accessorKey: 'createdAt', header: 'Created Date', cell: ({ row }) => formatDate(row.original.createdAt) },
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
              <DropdownMenuItem onClick={() => setViewingCustomer(customer)}>
                <Eye className="h-3.5 w-3.5" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteTarget(customer);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
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
        title="Customer Management"
        description="Manage customer organizations and their machines."
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
            emptyDescription="Add your first customer to get started."
          />
        </CardContent>
      </Card>

      <CustomerDetailsDialog customer={viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)} />
      <EditCustomerDialog customer={editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)} />

      <ConfirmDialog
        trigger={<span className="hidden" />}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete customer?"
        description={`This will permanently delete ${deleteTarget?.customerName} AND all of their machines, along with every historical sensor reading those machines ever recorded. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
