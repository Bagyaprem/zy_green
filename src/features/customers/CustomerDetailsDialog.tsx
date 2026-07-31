import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/format';
import type { Customer } from '@/types';

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsDialog({ customer, onOpenChange }: CustomerDetailsDialogProps) {
  const rows = customer
    ? [
        { label: 'Customer Name', value: customer.customerName },
        { label: 'Company', value: customer.companyName || '-' },
        { label: 'Email', value: customer.email },
        { label: 'Phone', value: customer.phone || '-' },
        { label: 'Address', value: customer.address || '-' },
        { label: 'Total Machines', value: String(customer.machineCount) },
        { label: 'Created', value: formatDate(customer.createdAt) },
      ]
    : [];

  return (
    <Dialog open={!!customer} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer?.customerName}</DialogTitle>
          <DialogDescription>Customer details</DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-foreground">{row.value}</span>
            </div>
          ))}
          {customer && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={customer.status === 'Active' ? 'success' : 'muted'}>{customer.status}</Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
