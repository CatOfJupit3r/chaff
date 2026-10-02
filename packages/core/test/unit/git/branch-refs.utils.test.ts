import { describe, expect, it } from 'vitest';

import { orderRemotes, parseBranchRef, preferLocal } from '@~/features/git/branch-refs.utils';

const REMOTES = orderRemotes(['upstream', 'origin', 'team/fork']);

describe('parseBranchRef', () => {
  it.each([
    ['refs/heads/feat/a', { name: 'feat/a', ref: 'refs/heads/feat/a' }],
    ['refs/remotes/origin/feat/a', { name: 'feat/a', ref: 'refs/remotes/origin/feat/a', remote: 'origin' }],
    ['refs/remotes/team/fork/feat/a', { name: 'feat/a', ref: 'refs/remotes/team/fork/feat/a', remote: 'team/fork' }],
  ])('reads %s', (ref, branch) => {
    expect(parseBranchRef(ref, REMOTES)).toEqual(branch);
  });

  it.each(['refs/remotes/origin/HEAD', 'refs/remotes/gone/feat/a', 'refs/tags/v1', 'refs/remotes/origin/'])(
    'ignores %s, which is not a branch of a configured remote',
    (ref) => {
      expect(parseBranchRef(ref, REMOTES)).toBeUndefined();
    },
  );
});

describe('preferLocal', () => {
  it('keeps the local branch over its remote twins, and origin over other remotes', () => {
    const refs = ['refs/remotes/upstream/a', 'refs/remotes/origin/a', 'refs/heads/a', 'refs/remotes/upstream/b']
      .concat(['refs/remotes/origin/b', 'refs/remotes/upstream/c'])
      .map((ref) => parseBranchRef(ref, REMOTES))
      .filter((ref) => ref !== undefined);

    expect(preferLocal(refs, REMOTES).map((ref) => ref.ref)).toEqual([
      'refs/heads/a',
      'refs/remotes/origin/b',
      'refs/remotes/upstream/c',
    ]);
  });
});
