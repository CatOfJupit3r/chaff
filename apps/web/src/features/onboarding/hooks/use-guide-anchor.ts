import { useEffect, useState } from 'react';

import { GUIDE_PANEL } from '../guide-position.constants';
import type { iOnboardingStep, iGuidePosition } from '../onboarding.types';
import { findGuideAnchor, isGuideElementVisible } from '../onboarding.utils';

export function useGuideAnchor(step: iOnboardingStep, isActive: boolean) {
  const [position, setPosition] = useState<iGuidePosition>({
    portal: document.body,
    hasPrimaryAnchor: false,
    panelHeight: GUIDE_PANEL.estimatedHeight,
  });
  useEffect(() => {
    if (!isActive) return undefined;
    let frame = 0;
    let hasScrolled = false;
    const measure = () => {
      const primary = findGuideAnchor(step.anchor);
      const element = primary ?? (step.fallback ? findGuideAnchor(step.fallback) : undefined);
      if (element && !hasScrolled) {
        element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        hasScrolled = true;
      }
      const rect = element?.getBoundingClientRect();
      const measuredHeight = document.querySelector<HTMLElement>('[data-onboarding-panel]')?.offsetHeight;
      const panelHeight =
        measuredHeight !== undefined && measuredHeight > 0 ? measuredHeight : GUIDE_PANEL.estimatedHeight;
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
      const portal = dialogs.findLast(isGuideElementVisible) ?? document.body;
      setPosition((previous) =>
        previous.element === element &&
        previous.portal === portal &&
        previous.rect?.x === rect?.x &&
        previous.rect?.y === rect?.y &&
        previous.rect?.width === rect?.width &&
        previous.rect?.height === rect?.height &&
        previous.hasPrimaryAnchor === (primary !== undefined) &&
        previous.panelHeight === panelHeight
          ? previous
          : { element, rect, portal, hasPrimaryAnchor: primary !== undefined, panelHeight },
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    const panel = document.querySelector('[data-onboarding-panel]');
    if (panel) resize.observe(panel);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    measure();
    return () => {
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [step, isActive]);
  return position;
}
