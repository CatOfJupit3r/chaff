import { describe, expect, it } from 'vitest';

import { buildLocalStacks } from '@~/features/workspaces/local-stacks.utils';
import type { iBranch } from '@~/features/workspaces/workspaces.types';

import { branch, workspace } from './workspace-fixtures';

const main = branch('main', { isDefault: true, parent: undefined, commitsAhead: 0 });

function stackNames(branches: iBranch[]) {
  return buildLocalStacks(workspace, branches).map((stack) => stack.branches.map(({ name }) => name));
}

describe('buildLocalStacks', () => {
  it('chains branches that build on each other into one stack', () => {
    const [stack, ...rest] = buildLocalStacks(workspace, [
      main,
      branch('feature/b', { parent: 'feature/a', commitsAhead: 2 }),
      branch('feature/a', { commitsAhead: 3 }),
      branch('feature/c', { parent: 'feature/b', commitsAhead: 1 }),
    ]);

    expect(rest).toHaveLength(0);
    expect(stack?.branches.map(({ name }) => name)).toEqual(['feature/a', 'feature/b', 'feature/c']);
    expect(stack?.tip.name).toBe('feature/c');
    expect(stack?.base).toBe('main');
    expect(stack?.commitCount).toBe(6);
  });

  it('gives each branch of a fork its own stack that shares the common bottom', () => {
    const names = stackNames([
      main,
      branch('feature/a'),
      branch('feature/b', { parent: 'feature/a', committedAt: new Date('2026-09-21T10:00:00Z') }),
      branch('feature/c', { parent: 'feature/a', committedAt: new Date('2026-09-22T10:00:00Z') }),
    ]);

    expect(names).toEqual([
      ['feature/a', 'feature/c'],
      ['feature/a', 'feature/b'],
    ]);
  });

  it('leaves out the default branch and stacks without commits of their own', () => {
    const names = stackNames([
      main,
      branch('feature/a'),
      branch('release-copy', { commitsAhead: 0 }),
      branch('hotfix', { commitsAhead: 2 }),
    ]);

    expect(names).toEqual([['feature/a'], ['hotfix']]);
  });

  it('lists the stack with the most recent tip first', () => {
    const names = stackNames([
      main,
      branch('older', { committedAt: new Date('2026-09-10T10:00:00Z') }),
      branch('newest', { committedAt: new Date('2026-09-25T10:00:00Z') }),
      branch('middle', { committedAt: new Date('2026-09-15T10:00:00Z') }),
    ]);

    expect(names).toEqual([['newest'], ['middle'], ['older']]);
  });

  it('keeps the base of a stack whose bottom branch sits on another non-local start point', () => {
    const [stack] = buildLocalStacks(workspace, [main, branch('feature/a', { parent: 'release/1.2' })]);

    expect(stack?.base).toBe('release/1.2');
  });
});
