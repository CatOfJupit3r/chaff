import { GUIDE_PANEL } from './guide-position.constants';

export function guidePanelPosition(rect: DOMRect | undefined, panelHeight: number) {
  const { gap } = GUIDE_PANEL;
  const width = Math.min(GUIDE_PANEL.width, window.innerWidth - gap * 2);
  const maxTop = Math.max(gap, window.innerHeight - panelHeight - gap);
  if (!rect) return { width, left: window.innerWidth - width - gap, top: maxTop };
  const hasSpaceRight = rect.right + width + gap * 2 <= window.innerWidth;
  const hasSpaceLeft = rect.left - width - gap * 2 >= 0;
  let left = Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap));
  if (hasSpaceRight) left = rect.right + gap;
  else if (hasSpaceLeft) left = rect.left - width - gap;
  let top = rect.top - panelHeight - gap;
  if (hasSpaceRight || hasSpaceLeft) top = rect.top;
  else if (rect.bottom + panelHeight + gap * 2 <= window.innerHeight) top = rect.bottom + gap;
  return { width, left, top: Math.max(gap, Math.min(top, maxTop)) };
}
