import { describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { buildOverviewStacks } from '@~/features/overview/overview.utils';

import { reviewTarget, snapshotSummary } from '../reviews/review-fixtures';
import { builtStack, stackMember } from '../stacks/stack-fixtures';
import { branch, workspace } from '../workspaces/workspace-fixtures';
import { remoteChange } from './overview-fixtures';

describe('overview stacks', () => {
  it("lists each built stack's branches bottom first with their review, preferring the merge request title", () => {
    const target = reviewTarget('retry', {
      latestSnapshot: snapshotSummary('2026-10-03', { regionCount: 18, accountedRegionCount: 2 }),
    });
    const stack = builtStack(['retry', 'dead-letter'], {
      branches: [
        stackMember('retry', {
          parentBranch: 'main',
          change: remoteChange(41, 'retry', 'main', { title: 'Add **retry** support' }),
        }),
        stackMember('dead-letter', { parentBranch: 'retry' }),
      ],
    });

    const [overview] = buildOverviewStacks({
      workspace,
      stacks: [stack],
      branches: [branch('retry'), branch('dead-letter')],
      targets: [target],
    });

    expect(overview?.branches.map((item) => [item.name, item.parent])).toEqual([
      ['retry', 'main'],
      ['dead-letter', 'retry'],
    ]);
    expect(overview?.branches[0]).toMatchObject({
      title: 'Add **retry** support',
      target,
      localTarget: target,
      change: { host: CODE_HOSTS.GITLAB, project: 'group/project', number: 41 },
      local: { name: 'retry' },
    });
    expect(overview).toMatchObject({ id: stack.id, tipBranch: 'dead-letter', title: 'Dead Letter', base: 'main' });
  });

  it('titles branches without a merge request by their name, ticket first', () => {
    const stacks = buildOverviewStacks({
      workspace,
      stacks: [builtStack(['PROJ-604-webhook-signing']), builtStack(['cleanup-tests'])],
      branches: [],
      targets: [],
    });

    expect(stacks.map((stack) => stack.title)).toEqual(['PROJ-604 | Webhook Signing', 'Cleanup Tests']);
  });

  it('uses the matching hosted review regardless of response order, without losing a separate local review', () => {
    const local = reviewTarget('retry', { latestSnapshot: snapshotSummary('2026-10-01') });
    const hosted = reviewTarget('retry', {
      id: 'hosted',
      kind: REVIEW_TARGET_KINDS.CHANGE_REQUEST,
      change: {
        host: CODE_HOSTS.GITLAB,
        project: 'group/project',
        number: 41,
        title: 'Retry',
        webUrl: 'https://gitlab.com/group/project/-/merge_requests/41',
      },
    });
    const stack = builtStack(['retry'], { branches: [stackMember('retry', { change: remoteChange(41, 'retry') })] });

    for (const targets of [
      [local, hosted],
      [hosted, local],
    ]) {
      const [overview] = buildOverviewStacks({ workspace, stacks: [stack], branches: [], targets });
      expect(overview?.branches[0]).toMatchObject({ target: hosted, localTarget: local });
    }
  });
});
