import { useAtom } from 'jotai';
import type { ReactNode } from 'react';

import { useGuideDockOffset } from '../hooks/use-guide-dock-offset';
import type { OnboardingGuideController } from '../hooks/use-onboarding-guide';
import { isGuideExpandedAtom } from '../onboarding.store';
import { GuideHint } from './guide-hint';
import { GuidePanel } from './guide-panel';
import { GuidePill } from './guide-pill';

interface iGuideDockProps {
  guide: OnboardingGuideController;
  /** A tip whose control is not on screen, shown above the checklist. */
  tipSlot: ReactNode;
}

/** Bottom-right corner stack: the screen hint, a tip with nothing to point at, then the checklist or its pill. */
export function GuideDock({ guide, tipSlot }: iGuideDockProps) {
  const [isStoredExpanded, setIsExpanded] = useAtom(isGuideExpandedAtom);
  const isExpanded = isStoredExpanded || guide.isFinishShown;
  const bottom = useGuideDockOffset();

  return (
    <div
      data-onboarding-panel
      className="pointer-events-none fixed right-4 z-55 flex w-[min(300px,calc(100vw-32px))] flex-col items-end gap-2"
      style={{ bottom, maxHeight: `calc(100vh - ${bottom + 16}px)` }}
    >
      {guide.hint.hint ? (
        <GuideHint
          hint={guide.hint.hint}
          items={guide.hint.items}
          onShowMe={guide.tip.showMe}
          onDismiss={guide.hint.dismiss}
        />
      ) : null}
      {tipSlot}
      {isExpanded ? (
        <GuidePanel guide={guide} onCollapse={() => setIsExpanded(false)} />
      ) : (
        <GuidePill doneCount={guide.doneCount} totalCount={guide.totalCount} onExpand={() => setIsExpanded(true)} />
      )}
    </div>
  );
}
