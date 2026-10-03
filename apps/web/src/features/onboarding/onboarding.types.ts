import type { OnboardingItem, OnboardingScreen } from '@chaff/common/enums/onboarding.enums';

import type { ORPCOutputs } from '@~/utils/orpc';

import type { OnboardingGroup } from './onboarding.enums';

export type iOnboardingState = ORPCOutputs['settings']['get']['onboarding'];

export interface iOnboardingItemGuide {
  group: OnboardingGroup;
  /** Where Show me goes; ANYWHERE stays on the current screen. */
  screen: OnboardingScreen;
  title: string;
  /** One or two plain sentences about the control, shown in the row and its tip. */
  tip: string;
  /** Said in the tip when the control is not on screen. */
  missing?: string;
  /** What makes a Later item possible. */
  unlock?: string;
  /** Other screens whose first-visit hint lists this item. */
  alsoOn?: readonly OnboardingScreen[];
}

export interface iGuideChecklistGroup {
  group: OnboardingGroup;
  items: readonly OnboardingItem[];
}
