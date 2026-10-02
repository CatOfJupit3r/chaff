import { createPortal } from 'react-dom';

import { useGuideAnchor } from '../hooks/use-guide-anchor';
import { useOnboardingGuide } from '../hooks/use-onboarding-guide';
import { GuideDock } from './guide-dock';
import { GuideSpotlight } from './guide-spotlight';
import { GuideTipCard } from './guide-tip-card';

/** The getting-started checklist docked in the corner, with Show me tips pointing at real controls. */
export function OnboardingGuide() {
  const guide = useOnboardingGuide();
  const rect = useGuideAnchor(guide.isVisible ? guide.tip.tipItem : undefined);
  if (!guide.isVisible) return null;
  const { tipItem } = guide.tip;
  const tipCard = tipItem ? (
    <GuideTipCard
      key={tipItem}
      item={tipItem}
      isAnchored={rect !== undefined}
      isWaitingForReview={guide.tip.isWaitingForReview}
      onClose={() => guide.tip.close(true)}
    />
  ) : null;

  return createPortal(
    <>
      {rect && tipCard ? <GuideSpotlight rect={rect}>{tipCard}</GuideSpotlight> : null}
      <GuideDock guide={guide} tipSlot={rect ? null : tipCard} />
    </>,
    document.body,
  );
}
