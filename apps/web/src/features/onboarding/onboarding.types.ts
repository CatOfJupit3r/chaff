import type { OnboardingStep } from '@chaff/common/enums/onboarding.enums';

import type { ORPCOutputs } from '@~/utils/orpc';

import type { OnboardingScreen } from './onboarding.enums';

export type iOnboardingState = ORPCOutputs['settings']['get']['onboarding'];

export interface iOnboardingAnchor {
  selector?: string;
  text?: string;
}

export interface iOnboardingStep {
  id: OnboardingStep;
  screen: OnboardingScreen;
  title: string;
  description: string;
  anchor: iOnboardingAnchor;
  fallback?: iOnboardingAnchor;
  action?: iOnboardingAnchor;
  prepare?: iOnboardingAnchor;
  unavailable?: string;
}

export interface iGuidePosition {
  rect?: DOMRect;
  element?: HTMLElement;
  portal: HTMLElement;
  hasPrimaryAnchor: boolean;
  panelHeight: number;
}
