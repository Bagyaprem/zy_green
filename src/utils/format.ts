import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import { appConfig } from '@/config/config';

function toDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date(value);
}

export function formatDate(value: string | number | Date): string {
  const d = toDate(value);
  return isValid(d) ? format(d, appConfig.dateFormat) : '-';
}

export function formatDateTime(value: string | number | Date): string {
  const d = toDate(value);
  return isValid(d) ? format(d, appConfig.dateTimeFormat) : '-';
}

export function formatTime(value: string | number | Date): string {
  const d = toDate(value);
  return isValid(d) ? format(d, appConfig.timeFormat) : '-';
}

export function formatRelativeTime(value: string | number | Date | null): string {
  if (!value) return 'Never';
  const d = toDate(value);
  if (!isValid(d)) return '-';
  return `${formatDistanceToNowStrict(d, { addSuffix: true })}`;
}

const DAY_MS = 86_400_000;

/**
 * Formats a chart X-axis tick according to how much time the series spans.
 *
 * A time-only tick is unambiguous on a one-hour chart and meaningless on a
 * seven-day one: the axis cycles through the same clock times over and over
 * with nothing to say which day any of them belongs to. Scale the label to
 * the range instead, and drop seconds - at any span wide enough to need a
 * date, seconds are noise.
 */
export function formatAxisTick(value: string | number | Date, spanMs: number): string {
  const d = toDate(value);
  if (!isValid(d)) return '-';
  if (spanMs >= 3 * DAY_MS) return format(d, 'dd MMM');
  if (spanMs >= DAY_MS) return format(d, 'dd MMM, hh:mm a');
  return format(d, 'hh:mm a');
}

/** Tick labels get wider once they carry a date, so they need more room between them. */
export function axisTickGap(spanMs: number): number {
  return spanMs >= DAY_MS ? 90 : 40;
}

/** Milliseconds covered by an ascending-by-time series; 0 for anything shorter than two points. */
export function seriesSpanMs(timestamps: (string | number | Date)[]): number {
  if (timestamps.length < 2) return 0;
  const first = toDate(timestamps[0]).getTime();
  const last = toDate(timestamps[timestamps.length - 1]).getTime();
  return Number.isFinite(first) && Number.isFinite(last) ? Math.max(last - first, 0) : 0;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return Number.isFinite(value)
    ? value.toLocaleString('en-IN', { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits })
    : '-';
}

export function formatBytes(kb: number): string {
  if (kb < 1024) return `${formatNumber(kb)} KB`;
  return `${formatNumber(kb / 1024, 1)} MB`;
}

export function formatUptime(seconds: number): string {
  if (!seconds) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ') || '0m';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
