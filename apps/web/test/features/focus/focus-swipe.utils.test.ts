import { describe, expect, it } from 'vitest';

import { isSidewaysDrag, swipeExit, SWIPE_DISTANCE_PX } from '@~/features/focus/focus-swipe.utils';
import { CARD_EXITS } from '@~/features/focus/focus.enums';

describe('card swipe', () => {
  it('tells a sideways drag from scrolling once it moved a little', () => {
    expect(isSidewaysDrag(3, 2)).toBeUndefined();
    expect(isSidewaysDrag(30, 6)).toBe(true);
    expect(isSidewaysDrag(-6, 40)).toBe(false);
  });

  it('decides only past the swipe distance', () => {
    expect(swipeExit(SWIPE_DISTANCE_PX)).toBe(CARD_EXITS.RIGHT);
    expect(swipeExit(-SWIPE_DISTANCE_PX - 5)).toBe(CARD_EXITS.LEFT);
    expect(swipeExit(SWIPE_DISTANCE_PX - 1)).toBeUndefined();
    expect(swipeExit(0)).toBeUndefined();
  });
});
