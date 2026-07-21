import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/types';
import { TIME_RANGE_OPTIONS } from '@/constants/options';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  customFrom?: string;
  customTo?: string;
  onCustomChange?: (from: string, to: string) => void;
}

export function TimeRangeSelector({ value, onChange, customFrom, customTo, onCustomChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-lg bg-muted p-1">
        {TIME_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              value === opt.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === 'CUSTOM' && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomChange?.(e.target.value, customTo ?? '')}
            className="h-8 w-[140px] text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomChange?.(customFrom ?? '', e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
        </div>
      )}
    </div>
  );
}
