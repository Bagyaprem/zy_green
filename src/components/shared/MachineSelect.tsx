import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { machineService } from '@/services/machineService';

interface MachineSelectProps {
  value: string;
  onChange: (machineId: string) => void;
  className?: string;
}

/** Lets the admin pick a machine by name/code — never exposes a raw machine id in the UI. */
export function MachineSelect({ value, onChange, className }: MachineSelectProps) {
  const { data: machines = [] } = useQuery({ queryKey: ['machines-lite'], queryFn: () => machineService.getMachines() });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select machine" />
      </SelectTrigger>
      <SelectContent>
        {machines.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.machineCode} · {m.machineName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
