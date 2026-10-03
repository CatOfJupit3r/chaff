import { describe, expect, it } from 'vitest';

import { FINDING_KINDS, FINDING_SCOPES, FINDING_STATUSES, UNIT_MARKS } from '@chaff/common/enums/review.enums';

import type { iSnapshotSummary } from '@~/features/reviews/reviews.types';
import type { iStackLink } from '@~/features/reviews/stack-review.utils';
import { findingsFromStack, findStack, markSegments } from '@~/features/stacks/stack.utils';
import type { iLocalStack } from '@~/features/workspaces/workspaces.types';

import { findingFixture } from '../findings/finding-fixtures';
import { reviewTarget, snapshotSummary } from '../reviews/review-fixtures';
import { branch, workspace } from '../workspaces/workspace-fixtures';

function summary(unitCount: number, markCounts: iSnapshotSummary['markCounts']) {
  return snapshotSummary('2026-09-20T10:00:00Z', { unitCount, markCounts });
}

function stack(...names: string[]): iLocalStack {
  const branches = names.map((name) => branch(name));
  const tip = branches.at(-1) ?? branch(names[0] ?? 'main');
  return { workspace, base: 'main', branches, tip, commitCount: branches.length };
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

describe('findStack', () => {
  const stacks = [stack('feature/a', 'feature/b'), stack('fix/c')];

  it('finds the stack that holds the branch, wherever it sits in the stack', () => {
    expect(findStack(stacks, 'feature/a')?.tip.name).toBe('feature/b');
    expect(findStack(stacks, 'fix/c')?.tip.name).toBe('fix/c');
  });

  it('falls back to the first stack when no branch is chosen or the branch is gone', () => {
    expect(findStack(stacks, null)?.tip.name).toBe('feature/b');
    expect(findStack(stacks, 'deleted')?.tip.name).toBe('feature/b');
  });
});

describe('findingsFromStack', () => {
  it('takes active concerns from the branches below and notes on the whole stack from any other branch', () => {
    const links: iStackLink[] = ['db', 'api', 'ui'].map((name) => ({
      branch: branch(name),
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
