import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { ONBOARDING_STEPS } from '@chaff/common/enums/onboarding.enums';

import { showToast } from '@~/components/toast/toast-store';
import { FOCUS_END } from '@~/features/focus/focus-cards.utils';
import { isKeyListOpenAtom } from '@~/features/keys/key-list.store';
import { snapshotQueryOptions } from '@~/features/reviews/hooks/use-snapshot';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { HOSTED_STACK_GUIDE } from '../onboarding.constants';
import { ONBOARDING_SCREENS } from '../onboarding.enums';
import type { iOnboardingState, iOnboardingStep } from '../onboarding.types';
import { findGuideAnchor } from '../onboarding.utils';

export function useGuideNavigation(
  state: iOnboardingState,
  step: iOnboardingStep,
  isActive: boolean,
  hasSkipped: RefObject<boolean>,
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const setIsKeyListOpen = useSetAtom(isKeyListOpenAtom);
  const entered = useRef<string | null>(null);
  const [openedStep, setOpenedStep] = useState<iOnboardingStep>();
  const isStillActive = useRef(isActive);
  useEffect(() => {
    isStillActive.current = isActive;
  }, [isActive]);
  useEffect(() => {
    if (!isActive) {
      entered.current = null;
      return;
    }
    if (hasSkipped.current) return;
    if (entered.current === step.id) return;
    entered.current = step.id;
    const openStep = async () => {
      let displayedStep = step;
      if (step.screen === ONBOARDING_SCREENS.REVIEWS && pathname !== '/') await navigate({ to: '/' });
      else if (step.screen === ONBOARDING_SCREENS.HISTORY && pathname !== '/history')
        await navigate({ to: '/history' });
      else if (step.screen === ONBOARDING_SCREENS.SETTINGS && pathname !== '/settings')
        await navigate({ to: '/settings' });
      else if (
        step.screen !== ONBOARDING_SCREENS.REVIEWS &&
        step.screen !== ONBOARDING_SCREENS.HISTORY &&
        step.screen !== ONBOARDING_SCREENS.SETTINGS &&
        state.reviewId
      ) {
        const snapshot = await queryClient.ensureQueryData(snapshotQueryOptions(state.reviewId));
        if (hasSkipped.current || !isStillActive.current) return;
        if (step.screen === ONBOARDING_SCREENS.STACK) {
          if (snapshot.change) {
            displayedStep = {
              ...step,
              ...HOSTED_STACK_GUIDE,
              anchor: {
                selector: `[data-onboarding-hosted-stack="${CSS.escape(`${snapshot.workspaceId}:${snapshot.change.project}`)}"]`,
              },
            };
            await navigate({ to: '/', search: { repository: snapshot.workspaceId, branch: snapshot.branch } });
          } else {
            await navigate({ to: '/stack', search: { workspace: snapshot.workspaceId, branch: snapshot.branch } });
          }
        } else if (step.screen === ONBOARDING_SCREENS.FINDINGS && pathname !== '/findings')
          await navigate({ to: '/findings' });
        else if (step.screen === ONBOARDING_SCREENS.DIFF && pathname !== `/reviews/${state.reviewId}/diff`)
          await navigate({ to: '/reviews/$snapshotId/diff', params: { snapshotId: state.reviewId } });
        else if (step.screen === ONBOARDING_SCREENS.EXPORT && pathname !== `/reviews/${state.reviewId}/export`)
          await navigate({ to: '/reviews/$snapshotId/export', params: { snapshotId: state.reviewId } });
        else if (step.screen === ONBOARDING_SCREENS.REVIEW) {
          if (step.id === ONBOARDING_STEPS.NEXT_BRANCH)
            await navigate({
              to: '/reviews/$snapshotId',
              params: { snapshotId: state.reviewId },
              search: (previous) => ({ ...previous, unit: FOCUS_END }),
            });
          else if (pathname !== `/reviews/${state.reviewId}` && pathname !== `/reviews/${state.reviewId}/`)
            await navigate({ to: '/reviews/$snapshotId', params: { snapshotId: state.reviewId } });
        }
      }
      if (hasSkipped.current || !isStillActive.current) return;
      if (step.id === ONBOARDING_STEPS.KEY_LIST) setIsKeyListOpen(true);
      setOpenedStep(displayedStep);
    };
    void openStep().catch((error: unknown) => showToast(getErrorMessage(error)));
  }, [state.reviewId, step, isActive, pathname, navigate, queryClient, setIsKeyListOpen, hasSkipped]);
  useEffect(() => {
    if (!isActive || openedStep?.id !== step.id || !step.prepare) return undefined;
    const prepare = () => {
      const target = step.prepare ? findGuideAnchor(step.prepare) : undefined;
      if (!target) return false;
      if (target.getAttribute('aria-pressed') !== 'true' && target.getAttribute('aria-selected') !== 'true')
        target.click();
      return true;
    };
    if (prepare()) return undefined;
    const observer = new MutationObserver(() => {
      if (prepare()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, [step, isActive, openedStep?.id]);
  return {
    hasOpenedStep: isActive && openedStep?.id === step.id,
    step: openedStep?.id === step.id ? openedStep : step,
  };
}
