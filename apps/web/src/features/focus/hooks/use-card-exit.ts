import { useEffect, useRef, useState } from 'react';

import type { CardExit } from '../focus.enums';

const EXIT_DURATION_MS = 230;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Plays the card's exit before the next card replaces it; skipped when motion is reduced. */
export function useCardExit() {
  const [exit, setExit] = useState<CardExit>();
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = (direction: CardExit, then: () => unknown) => {
    window.clearTimeout(timer.current);
    if (prefersReducedMotion()) {
      then();
      return;
    }
    setExit(direction);
    timer.current = window.setTimeout(() => {
      setExit(undefined);
      then();
    }, EXIT_DURATION_MS);
  };

  return { exit, run };
}
