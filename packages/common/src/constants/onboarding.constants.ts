import { ONBOARDING_STATUSES, ONBOARDING_STEPS } from '../enums/onboarding.enums';

export const INITIAL_ONBOARDING = {
  status: ONBOARDING_STATUSES.NOT_STARTED,
  step: ONBOARDING_STEPS.CHOOSE_CHANGE,
  reviewId: null,
};
