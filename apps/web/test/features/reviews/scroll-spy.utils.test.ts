import { describe, expect, it } from 'vitest';

import { lastSectionAbove } from '@~/features/reviews/scroll-spy.utils';

function sectionsAt(tops: number[]) {
  return tops.map((top) => ({ getBoundingClientRect: () => new DOMRect(0, top, 100, 50) }));
}

describe('lastSectionAbove', () => {
  const sections = sectionsAt([-900, -300, 20, 400, 1200]);

  it('picks the last section that has reached the line', () => {
    expect(lastSectionAbove(sections, 40)).toBe(2);
    expect(lastSectionAbove(sections, 400)).toBe(3);
  });

  it('keeps the last section once every section is above the line', () => {
    expect(lastSectionAbove(sections, 5000)).toBe(4);
  });

  it('finds none before the first section reaches the line', () => {
    expect(lastSectionAbove(sections, -1000)).toBe(-1);
    expect(lastSectionAbove([], 40)).toBe(-1);
  });
});
