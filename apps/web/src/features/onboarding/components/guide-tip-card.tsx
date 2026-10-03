import { useEffect, useId, useRef } from 'react';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { Button } from '@~/components/ui/button';

import { GUIDE_NEEDS_REVIEW, ONBOARDING_ITEM_GUIDES } from '../onboarding.constants';

interface iGuideTipCardProps {
  item: OnboardingItem;
  /** Whether the control is on screen and ringed. */
  isAnchored: boolean;
  isWaitingForReview: boolean;
  onClose: () => void;
}

/** What the highlighted control does, in a sentence or two. */
export function GuideTipCard({ item, isAnchored, isWaitingForReview, onClose }: iGuideTipCardProps) {
  const guide = ONBOARDING_ITEM_GUIDES(item);
  const titleId = useId();
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    card.current?.focus({ preventScroll: true });
  }, []);
  const missing = isAnchored ? undefined : guide.missing;
  const notice = isWaitingForReview ? GUIDE_NEEDS_REVIEW : missing;

  return (
    <section
      ref={card}
      role="dialog"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-onboarding-tip
      className="pointer-events-auto w-full rounded-lg border border-line-strong bg-surface p-3.5 text-fg shadow-dock outline-none"
    >
      <h3 id={titleId} className="m-0 text-[13px] font-semibold">
        {guide.title}
      </h3>
      <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-fg-soft">{guide.tip}</p>
      {notice ? <p className="m-0 mt-2 text-[12px] leading-relaxed text-muted">{notice}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11px] text-faint">Esc closes this tip</span>
        <Button size="sm" onClick={onClose}>
          Got it
        </Button>
      </div>
    </section>
  );
}
