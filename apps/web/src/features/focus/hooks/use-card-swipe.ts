import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import { isSidewaysDrag, swipeExit } from '../focus-swipe.utils';
import type { CardExit } from '../focus.enums';

interface iDrag {
  pointerId: number;
  x: number;
  y: number;
  isSideways?: boolean;
}

/**
 * Drags the card sideways with a finger or a pen; a mouse keeps selecting code. Letting go far enough calls
 * `onSwipe` with the side, otherwise the card slides back.
 */
export function useCardSwipe(onSwipe: ((exit: CardExit) => unknown) | undefined) {
  const [offset, setOffset] = useState(0);
  const drag = useRef<iDrag>(undefined);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!onSwipe || event.pointerType === 'mouse' || !event.isPrimary) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const { current } = drag;
    if (current?.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    current.isSideways ??= isSidewaysDrag(dx, event.clientY - current.y);
    if (current.isSideways === false) {
      drag.current = undefined;
      return;
    }
    if (current.isSideways) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.setPointerCapture(event.pointerId);
      setOffset(dx);
    }
  };
  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    const exit = event.type === 'pointerup' ? swipeExit(event.clientX - drag.current.x) : undefined;
    drag.current = undefined;
    setOffset(0);
    if (exit) onSwipe?.(exit);
  };

  return {
    offset,
    isDragging: offset !== 0,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
  };
}
