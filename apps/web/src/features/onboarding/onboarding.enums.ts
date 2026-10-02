import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

const onboardingScreenEnumwaii = new Enumwaii('OnboardingScreen', [
  'REVIEWS',
  'REVIEW',
  'STACK',
  'DIFF',
  'FINDINGS',
  'EXPORT',
  'HISTORY',
  'SETTINGS',
]);
export const ONBOARDING_SCREENS = onboardingScreenEnumwaii.enum;
export type OnboardingScreen = InferEnumwaii<typeof onboardingScreenEnumwaii>;
export const onboardingScreenSchema = onboardingScreenEnumwaii.schema;

const onboardingMutationStatusEnumwaii = new Enumwaii('OnboardingMutationStatus', [
  'idle',
  'pending',
  'success',
  'error',
]);
export const ONBOARDING_MUTATION_STATUSES = onboardingMutationStatusEnumwaii.enum;
export type OnboardingMutationStatus = InferEnumwaii<typeof onboardingMutationStatusEnumwaii>;
export const onboardingMutationStatusSchema = onboardingMutationStatusEnumwaii.schema;
