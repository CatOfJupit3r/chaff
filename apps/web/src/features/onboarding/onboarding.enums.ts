import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

export const onboardingGroupsEnumwaii = em(['START', 'READ', 'DECIDE', 'NOTE', 'HAND_OFF', 'MAKE_IT_YOURS', 'LATER']);
export const ONBOARDING_GROUPS = onboardingGroupsEnumwaii.enum;
export type OnboardingGroup = InferEnumwaii<typeof onboardingGroupsEnumwaii>;
export const onboardingGroupValues = onboardingGroupsEnumwaii.values;

export const ONBOARDING_GROUP_LABELS = onboardingGroupsEnumwaii.derive(
  [ONBOARDING_GROUPS.START, 'Start'],
  [ONBOARDING_GROUPS.READ, 'Read'],
  [ONBOARDING_GROUPS.DECIDE, 'Decide'],
  [ONBOARDING_GROUPS.NOTE, 'Note'],
  [ONBOARDING_GROUPS.HAND_OFF, 'Hand off'],
  [ONBOARDING_GROUPS.MAKE_IT_YOURS, 'Make it yours'],
  [ONBOARDING_GROUPS.LATER, 'Later'],
);

const onboardingMutationStatusEnumwaii = em(['idle', 'pending', 'success', 'error']);
export const ONBOARDING_MUTATION_STATUSES = onboardingMutationStatusEnumwaii.enum;
