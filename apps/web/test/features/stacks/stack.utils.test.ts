import { describe, expect, it } from 'vitest';

import { FINDING_KINDS, FINDING_SCOPES, FINDING_STATUSES, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { findingsFromStack, markSegments } from '@~/features/stacks/stack.utils';

import { findingFixture } from '../findings/finding-fixtures';
import { reviewTarget, snapshotSummary } from '../reviews/review-fixtures';
import { stackMember } from './stack-fixtures';

function summary(unitCount: number, markCounts: iSnapshotSummary['markCounts']) {
  return snapshotSummary('2026-09-20T10:00:00Z', { unitCount, markCounts });
}

describe('markSegments', () => {
  it('puts decided units first in a fixed order and the undecided rest last', () => {
    const segments = markSegments(
      summary(10, [
        { mark: UNIT_MARKS.QUESTION, count: 1 },
        { mark: UNIT_MARKS.LOOKS_GOOD, count: 4 },
        { mark: UNIT_MARKS.CONCERN, count: 2 },
      ]),
    );

    expect(segments).toEqual([
      { mark: UNIT_MARKS.LOOKS_GOOD, count: 4 },
      { mark: UNIT_MARKS.CONCERN, count: 2 },
      { mark: UNIT_MARKS.QUESTION, count: 1 },
      { count: 3 },
    ]);
  });

  it('leaves out the undecided segment once every unit has a decision', () => {
    expect(markSegments(summary(2, [{ mark: UNIT_MARKS.LATER, count: 2 }]))).toEqual([
      { mark: UNIT_MARKS.LATER, count: 2 },
    ]);
  });
});

describe('findingsFromStack', () => {
  it('takes active concerns from the branches below and notes on the whole stack from any other branch', () => {
    const links: iStackLink[] = ['db', 'api', 'ui'].map((name) => ({
      name,
      member: stackMember(name),
      target: reviewTarget(name),
    }));
    const onDb = findingFixture({ targetId: 'target:db', number: 1 });
    const questionOnDb = findingFixture({ targetId: 'target:db', number: 2, kind: FINDING_KINDS.QUESTION });
    const withdrawnOnDb = findingFixture({ targetId: 'target:db', number: 3, status: FINDING_STATUSES.WITHDRAWN });
    const stackNoteOnUi = findingFixture({
      targetId: 'target:ui',
      number: 4,
      kind: FINDING_KINDS.NOTE,
      scope: FINDING_SCOPES.STACK,
    });
    const onUi = findingFixture({ targetId: 'target:ui', number: 5 });
    const findings = [onDb, questionOnDb, withdrawnOnDb, stackNoteOnUi, onUi];

    expect(findingsFromStack(links, 1, findings)).toEqual([onDb, stackNoteOnUi]);
    expect(findingsFromStack(links, 0, findings)).toEqual([stackNoteOnUi]);
    expect(findingsFromStack(links, 2, findings)).toEqual([onDb]);
  });
});
