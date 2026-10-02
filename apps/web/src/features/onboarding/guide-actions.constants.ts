import { ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';
import type { OnboardingStep } from '@chaff/common/enums/onboarding.enums';
import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

export const ONBOARDING_DECISION_MARKS = new Map<OnboardingStep, UnitMark>([
  [ONBOARDING_STEPS.ACCEPT, UNIT_MARKS.LOOKS_GOOD],
  [ONBOARDING_STEPS.LATER, UNIT_MARKS.LATER],
  [ONBOARDING_STEPS.SKIP_CARD, UNIT_MARKS.SKIPPED],
]);
