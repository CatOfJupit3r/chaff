import { describe, expect, it } from 'vitest';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';

import type { iDiscussion, iRemoteChange } from '@~/features/code-hosts/code-hosts.types';
import { changeLabel, discussionsInRange, groupChangeStacks } from '@~/features/code-hosts/code-hosts.utils';

function change(changeNumber: number, sourceBranch: string, targetBranch = 'main'): iRemoteChange {
  return {
    number: changeNumber,
    title: `Change ${changeNumber}`,
    description: '',
    authorName: 'Agent',
    authorUsername: 'agent',
    sourceBranch,
    targetBranch,
    headSha: `${sourceBranch}-sha`,
    webUrl: `https://gitlab.com/group/project/-/merge_requests/${changeNumber}`,
    isDraft: false,
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    assigneeUsernames: [],
    reviewerUsernames: [],
  };
}

function discussion(id: string, path: string, newLine?: number): iDiscussion {
  return { id, path, newLine, isResolved: false, isOnSnapshot: true, notes: [] };
}

const numbers = (stacks: iRemoteChange[][]) => stacks.map((stack) => stack.map((item) => item.number));

describe('changeLabel', () => {
  it('writes the number the way each host does', () => {
    expect(changeLabel(CODE_HOSTS.GITLAB, 412)).toBe('!412');
    expect(changeLabel(CODE_HOSTS.GITHUB, 412)).toBe('#412');
  });
});

describe('groupChangeStacks', () => {
  it('stacks a change on the one whose branch it targets, whatever order they come in', () => {
    const stacks = groupChangeStacks([
      change(3, 'feature/c', 'feature/b'),
      change(1, 'feature/a'),
      change(2, 'feature/b', 'feature/a'),
      change(9, 'fix/other'),
    ]);

    expect(numbers(stacks)).toEqual([[1, 2, 3], [9]]);
  });

  it('starts a separate stack for a second change on the same branch', () => {
    const stacks = groupChangeStacks([
      change(1, 'feature/a'),
      change(2, 'feature/b', 'feature/a'),
      change(3, 'feature/c', 'feature/a'),
    ]);

    expect(numbers(stacks)).toEqual([[1, 2], [3]]);
  });
});

describe('discussionsInRange', () => {
  it("keeps the threads on the file's lines inside the range", () => {
    const threads = [
      discussion('in', 'src/a.ts', 4),
      discussion('after', 'src/a.ts', 9),
      discussion('other file', 'src/b.ts', 4),
      discussion('old side', 'src/a.ts'),
    ];

    expect(discussionsInRange(threads, 'src/a.ts', 2, 6).map((thread) => thread.id)).toEqual(['in']);
    expect(discussionsInRange(threads, 'src/a.ts', undefined, 6)).toEqual([]);
  });
});
