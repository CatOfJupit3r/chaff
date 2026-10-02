import { UNIT_MARKS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iUnit } from '@~/features/reviews/reviews.types';

/** A possibly affected unit still carrying the mark from before the change it may depend on. */
export function needsRecheck(unit: iUnit) {
  return unit.revision === UNIT_REVISIONS.POSSIBLY_AFFECTED && unit.isMarkCarried;
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
