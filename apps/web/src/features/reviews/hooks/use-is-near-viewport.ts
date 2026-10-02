import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** How far outside the scroll area a section starts loading. */
const LOAD_MARGIN = '400px 0px';
/** How far outside the scroll area a loaded section stays loaded. */
const KEEP_MARGIN = '2400px 0px';

interface iNearViewportOptions {
  /** Once near, stays near however far it scrolls away. */
  isPinned: boolean;
  /** Runs just before the element stops counting as near, while its contents are still in place. */
  onLeave: () => void;
}

/**
 * True from when the element scrolls near the visible part of `root` until it scrolls well past it again, so
 * far-away sections can let go of their contents.
 */
export function useIsNearViewport(
  ref: RefObject<HTMLElement | null>,
  root: HTMLElement | null,
  { isPinned, onLeave }: iNearViewportOptions,
) {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if ((isNear && isPinned) || !element || !root) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry || entry.isIntersecting === isNear) return;
        if (isNear) onLeave();
        setIsNear(!isNear);
      },
      { root, rootMargin: isNear ? KEEP_MARGIN : LOAD_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, root, isNear, isPinned, onLeave]);

  return isNear;
}
