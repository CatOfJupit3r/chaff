import { CARD_EXITS } from './focus.enums';

/** How far a card has to be dragged before letting go decides. */
export const SWIPE_DISTANCE_PX = 110;

/** Movement before a drag counts as sideways or as scrolling. */
const SWIPE_SLOP_PX = 8;

/** Whether a drag that moved by `dx`, `dy` is a sideways swipe; undefined while it is too short to tell. */
export function isSidewaysDrag(dx: number, dy: number) {
  if (Math.hypot(dx, dy) < SWIPE_SLOP_PX) return undefined;
  return Math.abs(dx) > Math.abs(dy);
}

/** Where a card dragged by `offset` pixels leaves to when let go: right, left, or back in place. */
export function swipeExit(offset: number) {
  if (offset >= SWIPE_DISTANCE_PX) return CARD_EXITS.RIGHT;
  if (offset <= -SWIPE_DISTANCE_PX) return CARD_EXITS.LEFT;
  return undefined;
}
