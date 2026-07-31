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
