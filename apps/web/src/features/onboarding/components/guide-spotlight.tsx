import { useState } from 'react';
import type { ReactNode } from 'react';

import { guideTipPosition } from '../guide-position.utils';
import { GUIDE_SIZES } from '../onboarding.constants';

interface iGuideSpotlightProps {
  rect: DOMRect;
  /** The tip, placed beside the control. */
  children: ReactNode;
}

/** A ring drawn over the real control and its tip floating beside it; neither takes space in the page. */
export function GuideSpotlight({ rect, children }: iGuideSpotlightProps) {
  const [tipHeight, setTipHeight] = useState<number>(GUIDE_SIZES.tipHeight);
  const measure = (node: HTMLDivElement | null) => {
    if (node && node.offsetHeight > 0 && node.offsetHeight !== tipHeight) setTipHeight(node.offsetHeight);
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-56 rounded-md border-2 border-accent shadow-spotlight"
        style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
      />
      <div ref={measure} className="fixed z-56" style={guideTipPosition(rect, tipHeight)}>
        {children}
      </div>
    </>
  );
}
