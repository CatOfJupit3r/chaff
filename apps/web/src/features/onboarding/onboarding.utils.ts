import { ONBOARDING_STATUSES, ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';

import { ONBOARDING_GUIDE } from './onboarding.constants';
import type { iOnboardingAnchor, iOnboardingState } from './onboarding.types';

export function isGuideActive(state: iOnboardingState) {
  return state.status === ONBOARDING_STATUSES.NOT_STARTED || state.status === ONBOARDING_STATUSES.IN_PROGRESS;
}

export function nextGuideState(state: iOnboardingState): iOnboardingState {
  const index = ONBOARDING_GUIDE.findIndex((step) => step.id === state.step);
  const next = ONBOARDING_GUIDE[index + 1];
  return next
    ? { ...state, status: ONBOARDING_STATUSES.IN_PROGRESS, step: next.id }
    : { ...state, status: ONBOARDING_STATUSES.COMPLETED, step: ONBOARDING_STEPS.DONE };
}

export function findGuideAnchor(anchor: iOnboardingAnchor) {
  const elements = document.querySelectorAll<HTMLElement>(anchor.selector ?? 'button, a');
  return Array.from(elements).find((element) => {
    if (element.closest('[data-onboarding-guide]')) return false;
    if (!isGuideElementVisible(element)) return false;
    return !anchor.text || element.textContent?.trim().startsWith(anchor.text);
  });
}

export function isGuideElementVisible(element: HTMLElement) {
  return (
    Array.from(element.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0) &&
    !element.closest('[aria-hidden="true"], [hidden]') &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}

export function closeGuideDialog() {
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
  const dialog = dialogs.findLast(isGuideElementVisible);
  const close = dialog?.querySelector<HTMLButtonElement>('button[aria-label="Close"]');
  if (close) {
    close.click();
    return;
  }
  if (dialog?.getAttribute('aria-label') === 'Write a note') {
    Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim().startsWith('Cancel'))
      ?.click();
  }
}
