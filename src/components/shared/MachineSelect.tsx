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
  // Same key as every other unfiltered machine list (Live Data, Account
  // Settings, the customer dashboard). It was 'machines-lite' but fetched
  // exactly the same rows with the same call, so it only ever bought a second
  // cache entry and a second network request on any page showing both.
  const { data: machines = [] } = useQuery({ queryKey: ['machines'], queryFn: () => machineService.getMachines() });

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
