import { format } from 'date-fns';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

/** Compact age for list metadata: "just now", "12 min ago", "3 h ago", "5 days ago", then a date. */
export function formatRelativeTime(date: Date, now = new Date()) {
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE_MS) return 'just now';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} min ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} h ago`;
  if (elapsed < MONTH_MS) {
    const days = Math.floor(elapsed / DAY_MS);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }
  return format(date, date.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy');
}
