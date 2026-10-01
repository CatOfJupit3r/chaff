import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iUnit } from '@~/features/reviews/reviews.types';

import { FOCUS_QUEUES } from './focus.enums';
import type { FocusQueue } from './focus.enums';

/** URL value of the card shown after the last unit. */
export const FOCUS_END = 'end';

function isQueued(unit: iUnit, queue: FocusQueue) {
  return queue === FOCUS_QUEUES.later ? unit.mark === UNIT_MARKS.LATER : unit.mark === undefined;
}

/**
 * The next unit in the queue after `fromIndex`, wrapping round to pick up units that were skipped.
 * Returns `units.length`, the end card, when the queue is empty.
 */
export function findNextIndex(units: readonly iUnit[], fromIndex: number, queue: FocusQueue) {
  for (let offset = 1; offset <= units.length; offset += 1) {
    const index = (fromIndex + offset) % units.length;
    const unit = units[index];
    if (index !== fromIndex && unit && isQueued(unit, queue)) return index;
  }
  return units.length;
}

/** The card to show: the one named in the URL, the end card, or the first unit still in the queue. */
export function resolveIndex(units: readonly iUnit[], unitParam: string | null, queue: FocusQueue) {
  if (unitParam === FOCUS_END) return units.length;
  const named = unitParam ? units.findIndex((unit) => unit.id === unitParam) : -1;
  return named === -1 ? findNextIndex(units, -1, queue) : named;
}

export function withMark(units: readonly iUnit[], unitId: string, mark: UnitMark | undefined) {
  return units.map((unit) => (unit.id === unitId ? { ...unit, mark } : unit));
}

export interface iMarkTally {
  looksGood: number;
  concerns: number;
  questions: number;
  later: number;
  untouched: number;
}

export function tallyMarks(units: readonly iUnit[]): iMarkTally {
  const count = (mark: UnitMark | undefined) => units.filter((unit) => unit.mark === mark).length;
  return {
    looksGood: count(UNIT_MARKS.LOOKS_GOOD),
    concerns: count(UNIT_MARKS.CONCERN),
    questions: count(UNIT_MARKS.QUESTION),
    later: count(UNIT_MARKS.LATER),
    untouched: count(undefined),
  };
}
