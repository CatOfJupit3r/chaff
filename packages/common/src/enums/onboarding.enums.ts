import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const onboardingStatusEnumwaii = em(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']);

export const ONBOARDING_STATUSES = onboardingStatusEnumwaii.enum;
export type OnboardingStatus = InferEnumwaii<typeof onboardingStatusEnumwaii>;
export const onboardingStatusSchema = emToZodSchema(onboardingStatusEnumwaii);

/** Things a reviewer does once on a change of their own to learn Chaff, in the order the checklist lists them. */
export const onboardingItemsEnumwaii = em([
  'ADD_REPOSITORY',
  'START_REVIEW',
  'DIGEST',
  'DIAGRAM',
  'CONTEXT',
  'WHOLE_FILE',
  'PROGRESSION',
  'LOOKS_GOOD',
  'LATER',
  'SKIP',
  'NOTE',
  'FINDINGS',
  'FULL_DIFF',
  'OUTPUT',
  'JUMP',
  'KEY_LIST',
  'CUSTOMIZE',
  'SECOND_PASS',
  'VERIFY',
  'NEXT_BRANCH',
  'HISTORY',
]);

export const ONBOARDING_ITEMS = onboardingItemsEnumwaii.enum;
export type OnboardingItem = InferEnumwaii<typeof onboardingItemsEnumwaii>;
export const onboardingItemSchema = emToZodSchema(onboardingItemsEnumwaii);
export const onboardingItemValues = onboardingItemsEnumwaii.values;

/** Screens the guide knows; ANYWHERE is a control shown on every screen. */
export const onboardingScreensEnumwaii = em([
  'REVIEWS',
  'FOCUS',
  'FULL_DIFF',
  'FINDINGS',
  'EXPORT',
  'HISTORY',
  'SETTINGS',
  'ANYWHERE',
]);

export const ONBOARDING_SCREENS = onboardingScreensEnumwaii.enum;
export type OnboardingScreen = InferEnumwaii<typeof onboardingScreensEnumwaii>;

/** Screens that show a one-time hint listing the open checklist items found there. */
export const onboardingHintsEnumwaii = onboardingScreensEnumwaii.pick([
  ONBOARDING_SCREENS.FOCUS,
  ONBOARDING_SCREENS.FULL_DIFF,
  ONBOARDING_SCREENS.FINDINGS,
  ONBOARDING_SCREENS.EXPORT,
  ONBOARDING_SCREENS.SETTINGS,
]);

export const ONBOARDING_HINTS = onboardingHintsEnumwaii.enum;
export type OnboardingHint = InferEnumwaii<typeof onboardingHintsEnumwaii>;
export const onboardingHintSchema = emToZodSchema(onboardingHintsEnumwaii);
