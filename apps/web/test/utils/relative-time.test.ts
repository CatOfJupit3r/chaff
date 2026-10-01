import { describe, expect, it } from 'vitest';

import { formatRelativeTime } from '@~/utils/relative-time';

const now = new Date('2026-10-01T12:00:00');

function ago(milliseconds: number) {
  return new Date(now.getTime() - milliseconds);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it.each([
    [ago(20 * 1000), 'just now'],
    [ago(12 * MINUTE), '12 min ago'],
    [ago(3 * HOUR + 40 * MINUTE), '3 h ago'],
    [ago(DAY + HOUR), 'yesterday'],
    [ago(5 * DAY), '5 days ago'],
  ])('describes %s as "%s"', (date, expected) => {
    expect(formatRelativeTime(date, now)).toBe(expected);
  });

  it('falls back to a date after a month, adding the year only when it differs', () => {
    expect(formatRelativeTime(new Date('2026-07-14T09:00:00'), now)).toBe('Jul 14');
    expect(formatRelativeTime(new Date('2025-12-03T09:00:00'), now)).toBe('Dec 3, 2025');
  });
});
