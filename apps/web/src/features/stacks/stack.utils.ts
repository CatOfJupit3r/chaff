import { FINDING_KINDS, FINDING_SCOPES, IS_ACTIVE_FINDING_STATUS, UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iFinding } from '@~/features/findings/findings.types';
import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';

/** Order of decisions in a progress bar, after which come the undecided units. */
const MARK_ORDER: UnitMark[] = [
  UNIT_MARKS.LOOKS_GOOD,
  UNIT_MARKS.CONCERN,
  UNIT_MARKS.QUESTION,
  UNIT_MARKS.SKIPPED,
  UNIT_MARKS.LATER,
];

export interface iMarkSegment {
  mark?: UnitMark;
  count: number;
}

/** A snapshot's units split by decision, decided first; empty segments are left out. */
export function markSegments(summary: iSnapshotSummary): iMarkSegment[] {
  const counts = new Map(summary.markCounts.map(({ mark, count }) => [mark, count]));
  const decided = MARK_ORDER.map((mark) => ({ mark, count: counts.get(mark) ?? 0 }));
  const undecided = summary.unitCount - decided.reduce((total, segment) => total + segment.count, 0);
  return [...decided, { count: Math.max(0, undecided) }].filter((segment) => segment.count > 0);
}

/**
 * Active concerns on the branches below the link at `index` (links run bottom first), and findings about
 * the whole stack written on its other branches: what bears on that branch from the rest of the stack.
 */
export function findingsFromStack(links: readonly iStackLink[], index: number, findings: readonly iFinding[]) {
  const targetIdsOf = (candidates: readonly iStackLink[]) =>
    new Set(candidates.flatMap((link) => (link.target ? [link.target.id] : [])));
  const below = targetIdsOf(links.slice(0, index));
  const others = targetIdsOf(links.filter((_, position) => position !== index));
  return findings.filter(
    (finding) =>
      IS_ACTIVE_FINDING_STATUS.get(finding.status) &&
      ((finding.kind === FINDING_KINDS.CONCERN && below.has(finding.targetId)) ||
        (finding.scope === FINDING_SCOPES.STACK && others.has(finding.targetId))),
  );
}
