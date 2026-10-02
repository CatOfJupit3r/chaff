import { useAtom } from 'jotai';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { isGuideFinishShownAtom } from '../onboarding.store';
import { CORE_ITEMS, countDoneItems, isGuideActive } from '../onboarding.utils';
import { useGuideActionTracking } from './use-guide-action-tracking';
import { useGuideHint } from './use-guide-hint';
import { useGuideTip } from './use-guide-tip';
import { useOnboardingProgress } from './use-onboarding-progress';

/** The getting-started checklist: its saved state, the actions that check items off, Show me tips and screen hints. */
export function useOnboardingGuide() {
  const state = useSettings().onboarding;
  const progress = useOnboardingProgress();
  const [isFinishShown, setIsFinishShown] = useAtom(isGuideFinishShownAtom);
  const tip = useGuideTip();
  const isActive = isGuideActive(state);

  useGuideActionTracking(isActive, (items: readonly OnboardingItem[]) => {
    if (tip.tipItem && items.includes(tip.tipItem)) tip.close();
    progress.complete(items);
  });
  const hint = useGuideHint(state, isActive, progress.markHintShown);

  return {
    state,
    isActive,
    isVisible: isActive || isFinishShown,
    isFinishShown,
    doneCount: countDoneItems(state.completedItems),
    totalCount: CORE_ITEMS.length,
    start: progress.start,
    skip: () => {
      tip.close();
      progress.skip();
    },
    finish: () => setIsFinishShown(false),
    tip,
    hint,
  };
}

export type OnboardingGuideController = ReturnType<typeof useOnboardingGuide>;
