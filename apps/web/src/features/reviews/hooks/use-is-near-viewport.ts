import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** How far outside the scroll area a section starts loading. */
const LOAD_MARGIN = '400px 0px';

/** Becomes true once the element scrolls near the visible part of `root`, and stays true. */
export function useIsNearViewport(ref: RefObject<HTMLElement | null>, root: HTMLElement | null) {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (isNear || !element || !root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
      },
      { root, rootMargin: LOAD_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, root, isNear]);

  return isNear;
}
