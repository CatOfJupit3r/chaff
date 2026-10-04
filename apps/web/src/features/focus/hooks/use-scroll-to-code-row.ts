import { DIFFS_TAG_NAME } from '@pierre/diffs';
import { useEffect, useRef } from 'react';

import { AREA_SCROLL_MARGIN_PX, AREA_SCROLL_MAX_FRAMES } from '../unit-areas.constants';

/**
 * A ref for a scrolling code box that scrolls it to the row matching `selector` once the diff renderer has
 * drawn that row, and again whenever the selector changes.
 */
export function useScrollToCodeRow(selector: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !selector) return undefined;
    let frame = 0;
    let attempts = 0;
    const scrollWhenDrawn = () => {
      const row = container.querySelector(DIFFS_TAG_NAME)?.shadowRoot?.querySelector(selector);
      if (row) {
        const offset = row.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTop += offset - AREA_SCROLL_MARGIN_PX;
        return;
      }
      attempts += 1;
      if (attempts < AREA_SCROLL_MAX_FRAMES) frame = requestAnimationFrame(scrollWhenDrawn);
    };
    frame = requestAnimationFrame(scrollWhenDrawn);
    return () => cancelAnimationFrame(frame);
  }, [selector]);

  return containerRef;
}
