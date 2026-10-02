import { useLocation, useParams } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { ONBOARDING_STATUSES, ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { ONBOARDING_GUIDE } from '../onboarding.constants';
import { ONBOARDING_SCREENS } from '../onboarding.enums';
import { closeGuideDialog, findGuideAnchor, isGuideActive, nextGuideState } from '../onboarding.utils';
import { useGuideNavigation } from './use-guide-navigation';
import { useGuideReviewActions } from './use-guide-review-actions';
import { useSaveOnboarding } from './use-save-onboarding';

export function useOnboardingGuide() {
  const state = useSettings().onboarding;
  const { save } = useSaveOnboarding();
  const { snapshotId } = useParams({ strict: false });
  const { pathname } = useLocation();
  const hasReachedPicker = useRef(false);
  const hasStartedAttempt = useRef(false);
  const hasSkipped = useRef(false);
  const index = ONBOARDING_GUIDE.findIndex((step) => step.id === state.step);
  const requestedStep = ONBOARDING_GUIDE[index] ?? ONBOARDING_GUIDE[0];
  const isActive = isGuideActive(state);
  const { hasOpenedStep, step } = useGuideNavigation(state, requestedStep, isActive, hasSkipped);
  const next = () => {
    if (save.isPending || hasSkipped.current || !hasOpenedStep) return;
    closeGuideDialog();
    save.mutate(nextGuideState(state));
  };
  const advanceOnAction = () => {
    if (!save.isPending && !hasSkipped.current) save.mutate(nextGuideState(state));
  };
  useGuideReviewActions(state, isActive, advanceOnAction);
  const skip = () => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    save.mutate(
      { ...state, status: ONBOARDING_STATUSES.SKIPPED },
      {
        onError: () => {
          hasSkipped.current = false;
        },
      },
    );
  };

  useEffect(() => {
    if (!isActive) {
      hasSkipped.current = false;
      hasReachedPicker.current = false;
      hasStartedAttempt.current = false;
      return;
    }
    if (pathname === '/' && !state.reviewId) hasReachedPicker.current = true;
    if (hasSkipped.current) return;
    if (state.status === ONBOARDING_STATUSES.NOT_STARTED) {
      if (!hasStartedAttempt.current) {
        hasStartedAttempt.current = true;
        save.mutate({ ...state, status: ONBOARDING_STATUSES.IN_PROGRESS });
      }
    }
  }, [state, isActive, save, pathname]);

  useEffect(() => {
    if (!isActive || !snapshotId || hasSkipped.current || save.isPending || !hasOpenedStep) return;
    if (
      hasReachedPicker.current &&
      (state.step === ONBOARDING_STEPS.CHOOSE_CHANGE || state.step === ONBOARDING_STEPS.START_REVIEW)
    ) {
      save.mutate({
        status: ONBOARDING_STATUSES.IN_PROGRESS,
        step: ONBOARDING_STEPS.REVIEW_SWITCHER,
        reviewId: snapshotId,
      });
    } else if (step.screen === ONBOARDING_SCREENS.REVIEW && snapshotId !== state.reviewId) {
      save.mutate({
        ...(state.step === ONBOARDING_STEPS.REVIEW_SWITCHER || state.step === ONBOARDING_STEPS.NEXT_BRANCH
          ? nextGuideState(state)
          : state),
        reviewId: snapshotId,
      });
    }
  }, [snapshotId, isActive, state, step, save, hasOpenedStep]);

  useEffect(() => {
    if (!isActive) return undefined;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        skip();
      }
    };
    const click = (event: MouseEvent) => {
      const action = step.action ? findGuideAnchor(step.action) : undefined;
      if (action && event.target instanceof Node && action.contains(event.target) && !action.matches(':disabled'))
        advanceOnAction();
    };
    window.addEventListener('keydown', keydown, true);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('keydown', keydown, true);
      document.removeEventListener('click', click, true);
    };
  });
  return {
    state,
    step,
    index,
    isActive,
    isSaving: save.isPending,
    next,
    skip,
    shouldAllowNext: hasOpenedStep && (state.step !== ONBOARDING_STEPS.START_REVIEW || state.reviewId !== null),
  };
}
