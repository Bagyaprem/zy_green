import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/shared/DataTable';
import { machineService } from '@/services/machineService';
import { customerService } from '@/services/customerService';
import { useMachineStore } from '@/store/machineStore';
import { useDebounce } from '@/hooks/useDebounce';
import { buildMachineColumns } from '@/features/machines/machineColumns';
import { AddMachineDialog } from '@/features/machines/AddMachineDialog';
import { EditMachineDialog } from '@/features/machines/EditMachineDialog';
import { MACHINE_STATUS_OPTIONS } from '@/constants/options';
import type { Machine } from '@/types';

export function MachinesPage() {
  const [searchParams] = useSearchParams();
  const { search, status, customerId, setSearch, setStatus, setCustomerId } = useMachineStore();
  const debouncedSearch = useDebounce(search, 250);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: customers = [] } = useQuery({ queryKey: ['customers-lite'], queryFn: () => customerService.getCustomers() });

  const machinesQuery = useQuery({
    queryKey: ['machines', debouncedSearch, status, customerId],
    queryFn: () => machineService.getMachines({ search: debouncedSearch, status, customerId }),
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: machineService.deleteMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Machine deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete machine'),
  });

  const columns = buildMachineColumns({
    onEdit: setEditingMachine,
    onDelete: (machine) => deleteMutation.mutate(machine.id),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Machine Management"
        description="Register and manage every ZYGREEN monitor across your customer fleet."
        actions={<AddMachineDialog />}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by machine, code, customer, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {MACHINE_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.customerName}
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
            data={machinesQuery.data ?? []}
            isLoading={machinesQuery.isLoading}
            isError={machinesQuery.isError}
            onRetry={() => machinesQuery.refetch()}
            emptyTitle="No machines found"
            emptyDescription="Try adjusting your search or filters, or add a new machine to get started."
            enableColumnVisibility
          />
        </CardContent>
      </Card>

      <EditMachineDialog machine={editingMachine} onOpenChange={(open) => !open && setEditingMachine(null)} />
    </div>
  );
}
