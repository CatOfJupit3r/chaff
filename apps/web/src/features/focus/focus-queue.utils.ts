import { UNIT_MARKS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iUnit } from '@~/features/reviews/reviews.types';

import { FOCUS_QUEUES } from './focus.enums';
import type { FocusQueue } from './focus.enums';

/** URL value of the card shown after the last unit. */
export const FOCUS_END = 'end';

/** A possibly affected unit still carrying the mark from before the change it may depend on. */
export function needsRecheck(unit: iUnit) {
  return unit.revision === UNIT_REVISIONS.POSSIBLY_AFFECTED && unit.isMarkCarried;
}

function isQueued(unit: iUnit, queue: FocusQueue) {
  if (queue === FOCUS_QUEUES.later) return unit.mark === UNIT_MARKS.LATER;
  if (queue === FOCUS_QUEUES.recheck) return needsRecheck(unit);
  return unit.mark === undefined;
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
  return units.map((unit) => (unit.id === unitId ? { ...unit, mark, isMarkCarried: false } : unit));
}

export interface iMarkTally {
  looksGood: number;
  concerns: number;
  questions: number;
  later: number;
  untouched: number;
  recheck: number;
}

export function tallyMarks(units: readonly iUnit[]): iMarkTally {
  const count = (mark: UnitMark | undefined) => units.filter((unit) => unit.mark === mark).length;
  return {
    looksGood: count(UNIT_MARKS.LOOKS_GOOD),
    concerns: count(UNIT_MARKS.CONCERN),
    questions: count(UNIT_MARKS.QUESTION),
    later: count(UNIT_MARKS.LATER),
    untouched: count(undefined),
    recheck: units.filter(needsRecheck).length,
  };
}

/** How many units of each revision the snapshot has, against the previous one. */
export function tallyRevisions(units: readonly iUnit[]) {
  const count = (revision: iUnit['revision']) => units.filter((unit) => unit.revision === revision).length;
  return {
    unchanged: count(UNIT_REVISIONS.UNCHANGED),
    edited: count(UNIT_REVISIONS.EDITED),
    added: count(UNIT_REVISIONS.NEW),
    possiblyAffected: count(UNIT_REVISIONS.POSSIBLY_AFFECTED),
    recheck: units.filter(needsRecheck).length,
    kept: units.filter((unit) => unit.isMarkCarried).length,
  };
}
