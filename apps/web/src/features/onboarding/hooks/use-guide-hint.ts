import { useLocation } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { onboardingHintsEnumwaii } from '@chaff/common/enums/onboarding.enums';
import type { OnboardingHint } from '@chaff/common/enums/onboarding.enums';

import type { iOnboardingState } from '../onboarding.types';
import { openItemsOn, screenForPath } from '../onboarding.utils';

interface iGuideVisit {
  pathname: string;
  hint?: OnboardingHint;
}

/**
 * The one-time hint for the screen the user just arrived on: shown on the first visit while the guide is on,
 * listing the open items found there, and remembered so later visits stay quiet.
 */
export function useGuideHint(
  state: iOnboardingState,
  isActive: boolean,
  markHintShown: (hint: OnboardingHint) => unknown,
) {
  const { pathname } = useLocation();
  const [visit, setVisit] = useState<iGuideVisit>();
  if (visit?.pathname !== pathname) {
    const screen = screenForPath(pathname);
    const isFirstVisit =
      isActive &&
      screen !== undefined &&
      onboardingHintsEnumwaii.is(screen) &&
      !state.shownHints.includes(screen) &&
      openItemsOn(screen, state.completedItems).length > 0;
    setVisit({ pathname, hint: isFirstVisit ? screen : undefined });
  }
  const hint = visit?.pathname === pathname ? visit.hint : undefined;

  useEffect(() => {
    if (hint) markHintShown(hint);
  }, [hint, markHintShown]);

  const items = hint && isActive ? openItemsOn(hint, state.completedItems) : [];
  return {
    hint: items.length > 0 ? hint : undefined,
    items,
    dismiss: () => setVisit({ pathname }),
  };
}
