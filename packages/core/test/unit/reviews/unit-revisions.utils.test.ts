import { describe, expect, it } from 'vitest';

import { SYMBOL_KINDS, UNIT_KINDS, UNIT_REVISIONS } from '@chaff/common/enums/review.enums';

import {
  changedDeclarationNames,
  classifyUnits,
  pairUnits,
  usesAnyName,
} from '@~/features/reviews/second-pass/unit-revisions.utils';
import type { iRevisionUnit } from '@~/features/reviews/second-pass/unit-revisions.utils';

function unit(id: string, overrides: Partial<iRevisionUnit>): iRevisionUnit {
  return {
    id,
    fileId: 'file',
    key: `a.ts::${id}`,
    contentHash: 'hash',
    kind: UNIT_KINDS.FUNCTION,
    title: id,
    symbolKind: SYMBOL_KINDS.FUNCTION,
    newStartLine: 1,
    newEndLine: 3,
    ...overrides,
  };
}

const pathOf = () => 'a.ts';

describe('unit revisions', () => {
  it('pairs units by key, in order when a key repeats, and edited sections by position', () => {
    const previous = [
      unit('p1', { key: 'a.ts::run', title: 'run' }),
      unit('p2', { key: 'a.ts::dup' }),
      unit('p3', { key: 'a.ts::dup' }),
      unit('p4', { key: 'a.ts::section:old', kind: UNIT_KINDS.SECTION, newStartLine: 10 }),
    ];
    const current = [
      unit('c1', { key: 'a.ts::run', title: 'run', contentHash: 'changed' }),
      unit('c2', { key: 'a.ts::dup' }),
      unit('c3', { key: 'a.ts::dup' }),
      unit('c4', { key: 'a.ts::section:new', contentHash: 'new', kind: UNIT_KINDS.SECTION, newStartLine: 12 }),
      unit('c5', { key: 'a.ts::fresh' }),
    ];

    const pairs = pairUnits(previous, current, pathOf);
    const revisions = classifyUnits(current, pairs);

    expect(Object.fromEntries([...pairs].map(([id, match]) => [id, match.id]))).toEqual({
      c1: 'p1',
      c2: 'p2',
      c3: 'p3',
      c4: 'p4',
    });
    expect(revisions.map((revision) => revision.revision)).toEqual([
      UNIT_REVISIONS.EDITED,
      UNIT_REVISIONS.UNCHANGED,
      UNIT_REVISIONS.UNCHANGED,
      UNIT_REVISIONS.EDITED,
      UNIT_REVISIONS.NEW,
    ]);
  });

  it('collects names of edited declarations and of ones whose change was undone', () => {
    const previous = [unit('p1', { key: 'a.ts::Queue.push', title: 'Queue.push' }), unit('p2', { title: 'gone' })];
    const current = [unit('c1', { key: 'a.ts::Queue.push', title: 'Queue.push', contentHash: 'changed' })];
    const revisions = classifyUnits(current, pairUnits(previous, current, pathOf));

    expect(changedDeclarationNames(previous, current, revisions)).toEqual(new Set(['push', 'gone']));
  });

  it('matches whole words other than the unit name itself', () => {
    const names = new Set(['push', 'retry']);

    expect(usesAnyName('queue.push(item);', names, undefined)).toBe(true);
    expect(usesAnyName('pushAll(items);', names, undefined)).toBe(false);
    expect(usesAnyName('function retry() {}', names, 'retry')).toBe(false);
  });
});
