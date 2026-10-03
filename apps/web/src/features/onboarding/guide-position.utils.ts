import { GUIDE_SIZES } from './onboarding.constants';

/** Places the tip beside the control: below it when there is room, otherwise above, kept inside the window. */
export function guideTipPosition(rect: DOMRect, tipHeight: number) {
  const { gap, edge } = GUIDE_SIZES;
  const width = Math.min(GUIDE_SIZES.tipWidth, window.innerWidth - edge * 2);
  const left = Math.max(edge, Math.min(rect.left, window.innerWidth - width - edge));
  const hasRoomBelow = rect.bottom + gap + tipHeight + edge <= window.innerHeight;
  const top = hasRoomBelow ? rect.bottom + gap : rect.top - gap - tipHeight;
  return { width, left, top: Math.max(edge, Math.min(top, window.innerHeight - tipHeight - edge)) };
}
