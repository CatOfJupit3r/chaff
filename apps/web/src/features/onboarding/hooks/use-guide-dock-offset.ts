import { useEffect, useState } from 'react';

import { GUIDE_SIZES } from '../onboarding.constants';
import { isGuideElementVisible } from '../onboarding.utils';

const AVOIDED = '[data-onboarding-avoid]';

/** How far above the window's bottom edge the checklist sits, so it clears bars pinned to the bottom such as Focus decisions. */
export function useGuideDockOffset() {
  const [offset, setOffset] = useState<number>(GUIDE_SIZES.edge);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const bars = Array.from(document.querySelectorAll<HTMLElement>(AVOIDED)).filter(isGuideElementVisible);
      const top = Math.min(window.innerHeight, ...bars.map((bar) => bar.getBoundingClientRect().top));
      setOffset(window.innerHeight - top + GUIDE_SIZES.edge);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return offset;
}
