import { describe, expect, it } from 'vitest';

import { JUMP_GROUPS } from '@~/features/jump/jump.enums';
import type { JumpGroup } from '@~/features/jump/jump.enums';
import { matchJumpItems } from '@~/features/jump/jump.utils';

function item(group: JumpGroup, label: string, detail?: string) {
  return { id: `${group}:${label}`, group, label, detail, open: () => undefined };
}

const ITEMS = [
  item(JUMP_GROUPS.SCREEN, 'Findings'),
  item(JUMP_GROUPS.FILE, 'src/delivery/backoff.ts'),
  item(JUMP_GROUPS.CARD, 'RetryScheduler.schedule', 'src/delivery/retry-scheduler.ts'),
  item(JUMP_GROUPS.CARD, 'computeBackoff', 'src/delivery/backoff.ts'),
  item(JUMP_GROUPS.REVIEW, 'feature/retry-backoff', 'webhooks'),
];

describe('matchJumpItems', () => {
  it('keeps items holding every word, names starting with the query first, grouped cards before files', () => {
    const labels = matchJumpItems(ITEMS, 'back').map((match) => match.label);

    expect(labels).toEqual(['computeBackoff', 'src/delivery/backoff.ts', 'feature/retry-backoff']);
    expect(matchJumpItems(ITEMS, 'retry sched').map((match) => match.label)).toEqual(['RetryScheduler.schedule']);
    expect(matchJumpItems(ITEMS, 'webhooks').map((match) => match.label)).toEqual(['feature/retry-backoff']);
  });

  it('lists everything in group order for an empty query', () => {
    expect(matchJumpItems(ITEMS, '  ').map((match) => match.group)).toEqual([
      JUMP_GROUPS.CARD,
      JUMP_GROUPS.CARD,
      JUMP_GROUPS.FILE,
      JUMP_GROUPS.REVIEW,
      JUMP_GROUPS.SCREEN,
    ]);
  });
});
