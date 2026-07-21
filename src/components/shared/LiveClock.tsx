import { useEffect, useState } from 'react';
import { formatDate, formatTime } from '@/utils/format';

export function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden flex-col items-end leading-tight md:flex">
      <span className="text-xs font-medium text-foreground">{formatTime(now)}</span>
      <span className="text-[11px] text-muted-foreground">{formatDate(now)}</span>
    </div>
  );
}
