import { ONBOARDING_SCREENS, ONBOARDING_STATUSES, onboardingItemValues } from '@chaff/common/enums/onboarding.enums';
import type { OnboardingItem, OnboardingScreen } from '@chaff/common/enums/onboarding.enums';

import { ONBOARDING_ITEM_GUIDES } from './onboarding.constants';
import { ONBOARDING_GROUPS, onboardingGroupValues } from './onboarding.enums';
import type { iGuideChecklistGroup, iOnboardingState } from './onboarding.types';

const REVIEW_SCREEN_PATHS = [
  { pattern: /^\/reviews\/[^/]+\/diff\/?$/, screen: ONBOARDING_SCREENS.FULL_DIFF },
  { pattern: /^\/reviews\/[^/]+\/export\/?$/, screen: ONBOARDING_SCREENS.EXPORT },
  { pattern: /^\/reviews\/[^/]+\/?$/, screen: ONBOARDING_SCREENS.FOCUS },
];

const SCREEN_PATHS = new Map<string, OnboardingScreen>([
  ['/', ONBOARDING_SCREENS.REVIEWS],
  ['/findings', ONBOARDING_SCREENS.FINDINGS],
  ['/history', ONBOARDING_SCREENS.HISTORY],
  ['/settings', ONBOARDING_SCREENS.SETTINGS],
]);

/** Items counted towards progress: everything outside the Later group. */
export const CORE_ITEMS = onboardingItemValues.filter(
  (item) => ONBOARDING_ITEM_GUIDES.get(item).group !== ONBOARDING_GROUPS.LATER,
);

export const GUIDE_CHECKLIST: readonly iGuideChecklistGroup[] = onboardingGroupValues.map((group) => ({
  group,
  items: onboardingItemValues.filter((item) => ONBOARDING_ITEM_GUIDES.get(item).group === group),
}));

export function isGuideActive(state: iOnboardingState) {
  return state.status === ONBOARDING_STATUSES.NOT_STARTED || state.status === ONBOARDING_STATUSES.IN_PROGRESS;
}

export function countDoneItems(completed: readonly OnboardingItem[]) {
  return CORE_ITEMS.filter((item) => completed.includes(item)).length;
}

export function isChecklistDone(completed: readonly OnboardingItem[]) {
  return CORE_ITEMS.every((item) => completed.includes(item));
}

export function firstOpenItem(completed: readonly OnboardingItem[]) {
  return CORE_ITEMS.find((item) => !completed.includes(item));
}

/** The state after the user did `items`; finishing the last counted item completes the guide. */
export function withCompletedItems(state: iOnboardingState, items: readonly OnboardingItem[]): iOnboardingState {
  const completedItems = [...state.completedItems, ...items.filter((item) => !state.completedItems.includes(item))];
  const status = isChecklistDone(completedItems) ? ONBOARDING_STATUSES.COMPLETED : ONBOARDING_STATUSES.IN_PROGRESS;
  return { ...state, status, completedItems };
}

/** Open items the user can do on `screen`, for its first-visit hint. */
export function openItemsOn(screen: OnboardingScreen, completed: readonly OnboardingItem[]) {
  return CORE_ITEMS.filter((item) => {
    const guide = ONBOARDING_ITEM_GUIDES.get(item);
    return !completed.includes(item) && (guide.screen === screen || guide.alsoOn?.includes(screen) === true);
  });
}

export function screenForPath(pathname: string) {
  return SCREEN_PATHS.get(pathname) ?? REVIEW_SCREEN_PATHS.find(({ pattern }) => pattern.test(pathname))?.screen;
}

export function isReviewScreen(screen: OnboardingScreen) {
  return REVIEW_SCREEN_PATHS.some((entry) => entry.screen === screen);
}

export function guideAnchorSelector(item: OnboardingItem) {
  return `[data-onboarding="${item}"]`;
}

export function isGuideElementVisible(element: HTMLElement) {
  return (
    Array.from(element.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0) &&
    !element.closest('[aria-hidden="true"], [hidden], [inert]') &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}

export function findGuideAnchor(item: OnboardingItem) {
  return Array.from(document.querySelectorAll<HTMLElement>(guideAnchorSelector(item))).find(isGuideElementVisible);
}
