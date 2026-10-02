import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';

import { Button } from '@~/components/ui/button';

import { guidePanelPosition } from '../guide-position.utils';
import { useGuideAnchor } from '../hooks/use-guide-anchor';
import { useOnboardingGuide } from '../hooks/use-onboarding-guide';
import { ONBOARDING_GUIDE } from '../onboarding.constants';

export function OnboardingGuide() {
  const guide = useOnboardingGuide();
  const { rect, portal, hasPrimaryAnchor, panelHeight } = useGuideAnchor(guide.step, guide.isActive);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!guide.isActive) return undefined;
    const previous = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [guide.isActive]);
  if (!guide.isActive) return null;
  const position = guidePanelPosition(rect, panelHeight);
  const isDone = guide.state.step === ONBOARDING_STEPS.DONE;

  return createPortal(
    <div data-onboarding-guide>
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-100 rounded-lg border-2 border-accent"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      ) : null}
      <section
        ref={panel}
        tabIndex={-1}
        data-onboarding-panel
        aria-label="Onboarding guide"
        className="fixed z-100 max-h-[calc(100vh-24px)] overflow-auto rounded-xl border border-line-strong bg-surface p-4 text-fg shadow-modal outline-none"
        style={position}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
          <span>
            Guide - {guide.index + 1} of {ONBOARDING_GUIDE.length}
          </span>
          <Button variant="ghost" size="sm" onClick={guide.skip}>
            Skip guide
          </Button>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <h2 className="mt-2 text-[15px] font-semibold">{guide.step.title}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-soft">{guide.step.description}</p>
          {!hasPrimaryAnchor && guide.step.unavailable ? (
            <p className="mt-2 text-[12px] text-muted">{guide.step.unavailable}</p>
          ) : null}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted">
            {guide.isSaving ? 'Saving progress...' : 'Esc skips the guide'}
          </span>
          <Button variant="primary" size="sm" disabled={guide.isSaving || !guide.shouldAllowNext} onClick={guide.next}>
            {isDone ? 'Finish' : 'Next'}
          </Button>
        </div>
      </section>
    </div>,
    portal,
  );
}
