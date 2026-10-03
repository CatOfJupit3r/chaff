import { ONBOARDING_STATUSES } from '../enums/onboarding.enums';
import type { OnboardingHint, OnboardingItem, OnboardingStatus } from '../enums/onboarding.enums';

interface iInitialOnboarding {
  status: OnboardingStatus;
  completedItems: OnboardingItem[];
  shownHints: OnboardingHint[];
}

export const INITIAL_ONBOARDING: iInitialOnboarding = {
  status: ONBOARDING_STATUSES.NOT_STARTED,
  completedItems: [],
  shownHints: [],
};

/** Upper bound on the stored item and hint lists. */
export const MAX_ONBOARDING_ENTRIES = 64;
