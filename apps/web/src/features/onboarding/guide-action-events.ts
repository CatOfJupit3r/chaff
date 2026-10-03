import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

type GuideActionListener = (item: OnboardingItem) => void;

const listeners = new Set<GuideActionListener>();

/** Tells the getting-started checklist the user just did `item` with a control that keeps its state on screen. */
export function reportGuideAction(item: OnboardingItem) {
  for (const listener of listeners) listener(item);
}

export function subscribeGuideActions(listener: GuideActionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
