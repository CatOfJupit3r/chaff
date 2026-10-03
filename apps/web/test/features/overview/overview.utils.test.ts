import { describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { buildOverviewStacks } from '@~/features/overview/overview.utils';
import { buildLocalStacks } from '@~/features/workspaces/local-stacks.utils';

import { reviewTarget, snapshotSummary } from '../reviews/review-fixtures';
import { branch, workspace } from '../workspaces/workspace-fixtures';
import { inboxProject, remoteChange } from './overview-fixtures';

describe('overview stack grouping', () => {
  it('joins local and hosted branches once, preserves local progress and prefers the merge request title', () => {
    const local = [branch('retry'), branch('dead-letter', { parent: 'retry' })];
    const target = reviewTarget('retry', {
      latestSnapshot: snapshotSummary('2026-10-03', { regionCount: 18, accountedRegionCount: 2 }),
    });
    const stacks = buildOverviewStacks({
      workspaces: [workspace],
      localStacks: buildLocalStacks(workspace, local),
      projects: [
        inboxProject([
          remoteChange(42, 'dead-letter', 'retry'),
          remoteChange(41, 'retry', 'main', { title: 'Add **retry** support' }),
        ]),
      ],
      targets: [target],
    });
    expect(stacks).toHaveLength(1);
    expect(stacks[0]?.branches.map((item) => item.name)).toEqual(['retry', 'dead-letter']);
    expect(stacks[0]?.branches[0]).toMatchObject({
      title: 'Add **retry** support',
      target,
      localTarget: target,
      change: { number: 41 },
    });
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
    for (const targets of [
      [local, hosted],
      [hosted, local],
    ]) {
      const stacks = buildOverviewStacks({
        workspaces: [workspace],
        localStacks: [],
        projects: [inboxProject([remoteChange(41, 'retry')])],
        targets,
      });
      expect(stacks[0]?.branches[0]).toMatchObject({ target: hosted, localTarget: local });
    }
  });

  it('keeps forks separate with their shared prerequisite, and isolates repositories', () => {
    const other = { ...workspace, id: 'other', name: 'other' };
    const stacks = buildOverviewStacks({
      workspaces: [workspace, other],
      localStacks: [],
      targets: [],
      projects: [
        inboxProject([remoteChange(3, 'c', 'a'), remoteChange(2, 'b', 'a'), remoteChange(1, 'a')]),
        inboxProject([remoteChange(1, 'a')], { workspaceId: other.id }),
      ],
    });
    expect(stacks.map((stack) => [stack.workspace.id, stack.branches.map((item) => item.name)])).toEqual([
      [workspace.id, ['a', 'c']],
      [workspace.id, ['a', 'b']],
      [other.id, ['a']],
    ]);
  });

  it('keeps cyclic requests visible with a warning instead of dropping or endlessly tracing them', () => {
    const stacks = buildOverviewStacks({
      workspaces: [workspace],
      localStacks: [],
      targets: [],
      projects: [inboxProject([remoteChange(1, 'a', 'b'), remoteChange(2, 'b', 'a')])],
    });
    expect(stacks).toHaveLength(1);
    expect(stacks[0]?.hasCycle).toBe(true);
    expect(stacks[0]?.branches.map((item) => item.name).sort()).toEqual(['a', 'b']);
  });
});
