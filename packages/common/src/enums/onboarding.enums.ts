import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const onboardingStatusEnumwaii = em(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']);

export const ONBOARDING_STATUSES = onboardingStatusEnumwaii.enum;
export type OnboardingStatus = InferEnumwaii<typeof onboardingStatusEnumwaii>;
export const onboardingStatusSchema = emToZodSchema(onboardingStatusEnumwaii);

const onboardingStepEnumwaii = em([
  'CHOOSE_CHANGE',
  'START_REVIEW',
  'REVIEW_SWITCHER',
  'STACK',
  'DIGEST',
  'DIAGRAM',
  'FOCUS',
  'ACCEPT',
  'LATER',
  'SKIP_CARD',
  'COMMENT',
  'CONTEXT',
  'WHOLE_FILE',
  'SWIPE',
  'UNITS',
  'FULL_DIFF',
  'FINDINGS',
  'SECOND_PASS',
  'VERIFY',
  'EXPORT',
  'OUTPUT',
  'NEXT_BRANCH',
  'HISTORY',
  'JUMP',
  'KEY_LIST',
  'APPEARANCE',
  'CUSTOMIZATION',
  'AGENTS',
  'REBIND_KEYS',
  'DONE',
]);

export const ONBOARDING_STEPS = onboardingStepEnumwaii.enum;
export type OnboardingStep = InferEnumwaii<typeof onboardingStepEnumwaii>;
export const onboardingStepSchema = emToZodSchema(onboardingStepEnumwaii);
