import { describe, expect, it } from 'vitest';

import { CHANGE_UNIT_SOURCES } from '@chaff/common/enums/review.enums';

import { changesFromDigest, mergeChanges } from '@~/features/reviews/change-units/change-units.utils';

const group = (id: string, unitIds: string[], isUnexplained = false) => ({ id, title: id, unitIds, isUnexplained });

describe('changesFromDigest', () => {
  it('keeps a unit in the first group that names it and drops groups left empty', () => {
    let next = 0;
    const changes = changesFromDigest(
      [group('g1', ['u1', 'u2']), group('g2', ['u2']), group('g3', ['u3', 'gone']), group('other', ['u4'], true)],
      new Set(['u1', 'u2', 'u3', 'u4']),
      () => `c${(next += 1)}`,
    );

    expect(changes).toEqual([
      { id: 'c1', title: 'g1', source: CHANGE_UNIT_SOURCES.DIGEST, digestGroupId: 'g1', unitIds: ['u1', 'u2'] },
      { id: 'c2', title: 'g3', source: CHANGE_UNIT_SOURCES.DIGEST, digestGroupId: 'g3', unitIds: ['u3'] },
    ]);
  });
});

describe('mergeChanges', () => {
  it("folds changes into the first in list order, whatever order they're named in", () => {
    const changes = [
      { id: 'a', title: 'A', source: CHANGE_UNIT_SOURCES.DIGEST, unitIds: ['u1'] },
      { id: 'b', title: 'B', source: CHANGE_UNIT_SOURCES.DIGEST, unitIds: ['u2'] },
      { id: 'c', title: 'C', source: CHANGE_UNIT_SOURCES.DIGEST, unitIds: ['u3'] },
    ];

    expect(mergeChanges(changes, ['c', 'a'], 'A and C')).toEqual([
      { id: 'a', title: 'A and C', source: CHANGE_UNIT_SOURCES.REVIEWER, unitIds: ['u1', 'u3'] },
      changes[1],
    ]);
  });
});
