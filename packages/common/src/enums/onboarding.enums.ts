import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

const onboardingStatusEnumwaii = new Enumwaii('OnboardingStatus', [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
]);

export const ONBOARDING_STATUSES = onboardingStatusEnumwaii.enum;
export type OnboardingStatus = InferEnumwaii<typeof onboardingStatusEnumwaii>;
export const onboardingStatusSchema = onboardingStatusEnumwaii.schema;

/** Things a reviewer does once on a change of their own to learn Chaff, in the order the checklist lists them. */
export const onboardingItemsEnumwaii = new Enumwaii('OnboardingItem', [
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
export const onboardingItemSchema = onboardingItemsEnumwaii.schema;
export const onboardingItemValues = onboardingItemsEnumwaii.values;

/** Screens the guide knows; ANYWHERE is a control shown on every screen. */
export const onboardingScreensEnumwaii = new Enumwaii('OnboardingScreen', [
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
export const onboardingHintsEnumwaii = onboardingScreensEnumwaii.pick('OnboardingHint', [
  ONBOARDING_SCREENS.FOCUS,
  ONBOARDING_SCREENS.FULL_DIFF,
  ONBOARDING_SCREENS.FINDINGS,
  ONBOARDING_SCREENS.EXPORT,
  ONBOARDING_SCREENS.SETTINGS,
]);

export const ONBOARDING_HINTS = onboardingHintsEnumwaii.enum;
export type OnboardingHint = InferEnumwaii<typeof onboardingHintsEnumwaii>;
export const onboardingHintSchema = onboardingHintsEnumwaii.schema;
