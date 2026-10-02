import { useEffect, useState } from 'react';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { findGuideAnchor } from '../onboarding.utils';

function isSameRect(previous: DOMRect | undefined, next: DOMRect | undefined) {
  return (
    previous?.x === next?.x &&
    previous?.y === next?.y &&
    previous?.width === next?.width &&
    previous?.height === next?.height
  );
}

/** Where the real control for `item` is on screen, following it as the page changes; undefined while it is not shown. */
export function useGuideAnchor(item: OnboardingItem | undefined) {
  const [rect, setRect] = useState<DOMRect>();
  useEffect(() => {
    if (!item) return undefined;
    let frame = 0;
    let hasScrolled = false;
    const measure = () => {
      const element = findGuideAnchor(item);
      if (element && !hasScrolled) {
        element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        hasScrolled = true;
      }
      const next = element?.getBoundingClientRect();
      setRect((previous) => (isSameRect(previous, next) ? previous : next));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [item]);
  return item ? rect : undefined;
}
