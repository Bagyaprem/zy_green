import { useQuery } from '@tanstack/react-query';
import { Check, Minus } from 'lucide-react';
import { userService } from '@/services/userService';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/types';

export function PermissionsPanel({ highlightRole }: { highlightRole?: UserRole }) {
  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: userService.getRolePermissions,
  });

  if (isLoading) return <CardSkeleton className="h-64 w-full" />;

  const permissionKeys = rolePermissions[0]?.permissions.map((p) => p.key) ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permission</th>
            {rolePermissions.map((rp) => (
              <th key={rp.role} className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className={rp.role === highlightRole ? 'text-primary' : ''}>{rp.role}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissionKeys.map((key) => {
            const label = rolePermissions[0]?.permissions.find((p) => p.key === key)?.label;
            return (
              <tr key={key} className="border-t border-border">
                <td className="px-3 py-2 text-xs text-foreground">{label}</td>
                {rolePermissions.map((rp) => {
                  const allowed = rp.permissions.find((p) => p.key === key)?.allowed;
                  return (
                    <td key={rp.role} className="px-3 py-2 text-center">
                      {allowed ? <Check className="mx-auto h-4 w-4 text-success" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2 border-t border-border p-3">
        {rolePermissions.map((rp) => (
          <div key={rp.role} className="flex items-center gap-1.5">
            <Badge variant="outline">{rp.role}</Badge>
            <span className="text-[11px] text-muted-foreground">{rp.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
