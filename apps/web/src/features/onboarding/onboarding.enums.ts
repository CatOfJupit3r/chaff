import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const onboardingScreenEnumwaii = em([
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
export const onboardingScreenSchema = emToZodSchema(onboardingScreenEnumwaii);

const onboardingMutationStatusEnumwaii = em(['idle', 'pending', 'success', 'error']);
export const ONBOARDING_MUTATION_STATUSES = onboardingMutationStatusEnumwaii.enum;
export type OnboardingMutationStatus = InferEnumwaii<typeof onboardingMutationStatusEnumwaii>;
export const onboardingMutationStatusSchema = emToZodSchema(onboardingMutationStatusEnumwaii);
