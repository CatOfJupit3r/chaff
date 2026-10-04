import { describe, expect, it } from 'vitest';

import {
  CHANGE_UNIT_SOURCES,
  REVIEW_PROGRESSIONS,
  UNIT_KINDS,
  UNIT_MARKS,
  UNIT_REVISIONS,
} from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iChangeUnit } from '@~/features/change-units/change-units.types';
import {
  buildFocusCards,
  cardMark,
  FOCUS_END,
  findNextIndex,
  resolveIndex,
  withMarks,
} from '@~/features/focus/focus-cards.utils';
import { FOCUS_QUEUES } from '@~/features/focus/focus.enums';

import { unitFixture as unit } from '../reviews/review-fixtures';

const units = [
  unit('a', UNIT_MARKS.LOOKS_GOOD),
  unit('b'),
  unit('c', UNIT_MARKS.LATER),
  unit('d'),
  unit('e', UNIT_MARKS.CONCERN, { kind: UNIT_KINDS.SECTION }),
];
const asCards = (list = units) => buildFocusCards(list, [], REVIEW_PROGRESSIONS.changes);
const change = (id: string, unitIds: string[]): iChangeUnit => ({
  id,
  title: id,
  source: CHANGE_UNIT_SOURCES.REVIEWER,
  unitIds,
});
const marked = (entries: [string, UnitMark][]) => new Map<string, UnitMark | undefined>(entries);

describe('focus cards', () => {
  it('puts Change units first, then every unit no change covers', () => {
    const cards = buildFocusCards(
      units,
      [change('x', ['d', 'b']), change('empty', ['gone'])],
      REVIEW_PROGRESSIONS.changes,
    );
    expect(cards.map((card) => [card.id, card.units.map((member) => member.id)])).toEqual([
      ['x', ['d', 'b']],
      ['a', ['a']],
      ['c', ['c']],
      ['e', ['e']],
    ]);
  });

  it('shows one kind of unit in the Functions and Sections progressions', () => {
    const changes = [change('x', ['a', 'e'])];
    expect(buildFocusCards(units, changes, REVIEW_PROGRESSIONS.functions).map((card) => card.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(buildFocusCards(units, changes, REVIEW_PROGRESSIONS.sections).map((card) => card.id)).toEqual(['e']);
  });

  it('shows every unit on its own card in the Units progression, ignoring Change units', () => {
    const cards = buildFocusCards(units, [change('x', ['a', 'e'])], REVIEW_PROGRESSIONS.units);
    expect(cards.map((card) => [card.id, card.units.map((member) => member.id)])).toEqual(
      units.map((member) => [member.id, [member.id]]),
    );
  });

  it('gives a change the mark its units share, and none while they differ', () => {
    const [mixed] = buildFocusCards(units, [change('x', ['a', 'c'])], REVIEW_PROGRESSIONS.changes);
    const [same] = buildFocusCards(units, [change('y', ['a', 'a'])], REVIEW_PROGRESSIONS.changes);
    expect(mixed && cardMark(mixed)).toBeUndefined();
    expect(same && cardMark(same)).toBe(UNIT_MARKS.LOOKS_GOOD);
  });

  it('opens on the first card without a decision, or the card holding the unit in the URL', () => {
    const cards = buildFocusCards(units, [change('x', ['a', 'd'])], REVIEW_PROGRESSIONS.changes);
    expect(resolveIndex(cards, null, FOCUS_QUEUES.open)).toBe(0);
    expect(resolveIndex(cards, 'd', FOCUS_QUEUES.open)).toBe(0);
    expect(resolveIndex(cards, 'e', FOCUS_QUEUES.open)).toBe(3);
    expect(resolveIndex(cards, FOCUS_END, FOCUS_QUEUES.open)).toBe(cards.length);
    expect(resolveIndex(cards, 'from-another-snapshot', FOCUS_QUEUES.open)).toBe(0);
  });

  it('skips decided cards, wraps round to skipped ones, and reaches the end card', () => {
    const cards = asCards();
    expect(findNextIndex(cards, 1, FOCUS_QUEUES.open)).toBe(3);
    expect(findNextIndex(cards, 3, FOCUS_QUEUES.open)).toBe(1);
    const decided = withMarks(
      cards,
      marked([
        ['b', UNIT_MARKS.LOOKS_GOOD],
        ['d', UNIT_MARKS.QUESTION],
      ]),
    );
    expect(findNextIndex(decided, 3, FOCUS_QUEUES.open)).toBe(cards.length);
  });

  it('walks only cards put off with Later in the Later queue', () => {
    const cards = asCards();
    expect(resolveIndex(cards, null, FOCUS_QUEUES.later)).toBe(2);
    const decided = withMarks(cards, marked([['c', UNIT_MARKS.LOOKS_GOOD]]));
    expect(findNextIndex(decided, 2, FOCUS_QUEUES.later)).toBe(cards.length);
  });

  it('walks the possibly affected units whose mark was kept, until each is decided again', () => {
    const cards = asCards([
      unit('a', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.UNCHANGED, isMarkCarried: true }),
      unit('b', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.POSSIBLY_AFFECTED, isMarkCarried: true }),
      unit('c', undefined, { revision: UNIT_REVISIONS.EDITED }),
      unit('d', UNIT_MARKS.LOOKS_GOOD, { revision: UNIT_REVISIONS.POSSIBLY_AFFECTED, isMarkCarried: true }),
    ]);
    expect(resolveIndex(cards, null, FOCUS_QUEUES.recheck)).toBe(1);
    const decided = withMarks(cards, marked([['b', UNIT_MARKS.LOOKS_GOOD]]));
    expect(findNextIndex(decided, 1, FOCUS_QUEUES.recheck)).toBe(3);
    expect(findNextIndex(withMarks(decided, marked([['d', UNIT_MARKS.CONCERN]])), 3, FOCUS_QUEUES.recheck)).toBe(4);
  });
});
