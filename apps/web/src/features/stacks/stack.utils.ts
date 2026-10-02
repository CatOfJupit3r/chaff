import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import type { iLocalStack } from '@~/features/workspaces/workspaces.types';

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

/** The stack a branch belongs to; a branch in several stacks (a shared base) picks the first. */
export function findStack(stacks: readonly iLocalStack[], branch: string | null) {
  if (!branch) return stacks[0];
  return stacks.find((stack) => stack.branches.some((candidate) => candidate.name === branch)) ?? stacks[0];
}
