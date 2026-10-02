import { useRef, useState } from 'react';

import { useIsNearViewport } from './use-is-near-viewport';

/**
 * Mounts a file section's diff only while the section is near the visible part of `scrollRoot`. A section that
 * scrolls far away keeps its measured height, so nothing around it moves; one the reviewer has clicked or
 * focused inside stays mounted, keeping expanded lines, selections and notes.
 */
export function useLazyDiffBody(scrollRoot: HTMLElement | null) {
  const sectionRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [reservedHeight, setReservedHeight] = useState<number>();

  const isNear = useIsNearViewport(sectionRef, scrollRoot, {
    isPinned,
    onLeave: () => {
      if (bodyRef.current) setReservedHeight(bodyRef.current.offsetHeight);
    },
  });

  return { sectionRef, bodyRef, isNear, reservedHeight, pin: () => setIsPinned(true) };
}
