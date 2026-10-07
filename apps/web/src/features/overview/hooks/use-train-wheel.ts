import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { TRAIN_WHEEL_COOLDOWN_MS, TRAIN_WHEEL_STEP } from '@~/features/stacks/stacks.constants';

/**
 * Turns the wheel, while the pointer is over the element, into steps of one branch: `onStep(1)` along the stack,
 * `onStep(-1)` back. The page does not scroll meanwhile, and a pause after each step keeps one flick to one branch.
 */
export function useTrainWheel(element: RefObject<HTMLElement | null>, onStep: (direction: 1 | -1) => unknown) {
  const onStepRef = useRef(onStep);
  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  useEffect(() => {
    const target = element.current;
    if (!target) return undefined;
    let travelled = 0;
    let blockedUntil = 0;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.timeStamp < blockedUntil) return;
      travelled += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(travelled) < TRAIN_WHEEL_STEP) return;
      onStepRef.current(travelled > 0 ? 1 : -1);
      travelled = 0;
      blockedUntil = event.timeStamp + TRAIN_WHEEL_COOLDOWN_MS;
    };
    target.addEventListener('wheel', handleWheel, { passive: false });
    return () => target.removeEventListener('wheel', handleWheel);
  }, [element]);
}
