import { describe, expect, it } from 'vitest';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';

import { orderByReading, rememberDigestModel, splitInlineCode } from '@~/features/digests/digests.utils';

const units = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('orderByReading', () => {
  it('puts units in the reading order and keeps the rest in file order after them', () => {
    expect(orderByReading(units, ['c', 'a']).map((unit) => unit.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('keeps file order when there is no digest', () => {
    expect(orderByReading(units, undefined)).toBe(units);
  });

  it('ignores ids that are not units of this review', () => {
    expect(orderByReading(units, ['x', 'd']).map((unit) => unit.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});

describe('rememberDigestModel', () => {
  const models = [
    { runner: DIGEST_RUNNERS.CLAUDE_CODE, model: 'opus' },
    { runner: DIGEST_RUNNERS.CODEX, model: 'gpt-5.6-sol' },
  ];

  it("replaces only the runner's own model", () => {
    expect(rememberDigestModel(models, DIGEST_RUNNERS.CODEX, 'gpt-6-astra')).toEqual([
      { runner: DIGEST_RUNNERS.CLAUDE_CODE, model: 'opus' },
      { runner: DIGEST_RUNNERS.CODEX, model: 'gpt-6-astra' },
    ]);
  });

  it('forgets the model when the runner runs with its default', () => {
    expect(rememberDigestModel(models, DIGEST_RUNNERS.CLAUDE_CODE, undefined)).toEqual([
      { runner: DIGEST_RUNNERS.CODEX, model: 'gpt-5.6-sol' },
    ]);
  });
});

describe('splitInlineCode', () => {
  it('puts backticked names at odd positions', () => {
    expect(splitInlineCode('Returns `delay` for `attempt`.')).toEqual(['Returns ', 'delay', ' for ', 'attempt', '.']);
  });
});
