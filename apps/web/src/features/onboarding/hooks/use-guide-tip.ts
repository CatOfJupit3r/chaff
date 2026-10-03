import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';

import { ONBOARDING_SCREENS } from '@chaff/common/enums/onboarding.enums';
import type { OnboardingItem, OnboardingScreen } from '@chaff/common/enums/onboarding.enums';

import { showToast } from '@~/components/toast/toast-store';
import { lastSnapshotIdAtom } from '@~/features/reviews/last-review.store';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { ONBOARDING_ITEM_GUIDES } from '../onboarding.constants';
import { guideTipItemAtom } from '../onboarding.store';
import { isReviewScreen, screenForPath } from '../onboarding.utils';

const GUIDE_SURFACES = '[data-onboarding-tip], [data-onboarding-panel]';

/**
 * Show me: opens the item's screen only when asked, then points at its control. The tip closes on Esc, on a
 * click outside it and the checklist, or when the item is done; Esc does nothing else while a tip is open.
 */
export function useGuideTip() {
  const [tipItem, setTipItem] = useAtom(guideTipItemAtom);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { snapshotId } = useParams({ strict: false });
  const lastSnapshotId = useAtomValue(lastSnapshotIdAtom);
  const reviewId = snapshotId ?? lastSnapshotId ?? undefined;
  const returnFocus = useRef<Element | null>(null);

  const goTo = async (screen: OnboardingScreen) => {
    if (screen === ONBOARDING_SCREENS.REVIEWS) return navigate({ to: '/' });
    if (screen === ONBOARDING_SCREENS.FINDINGS) return navigate({ to: '/findings' });
    if (screen === ONBOARDING_SCREENS.HISTORY) return navigate({ to: '/history' });
    if (screen === ONBOARDING_SCREENS.SETTINGS) return navigate({ to: '/settings' });
    if (!reviewId) return undefined;
    if (screen === ONBOARDING_SCREENS.FULL_DIFF)
      return navigate({ to: '/reviews/$snapshotId/diff', params: { snapshotId: reviewId } });
    if (screen === ONBOARDING_SCREENS.EXPORT)
      return navigate({ to: '/reviews/$snapshotId/export', params: { snapshotId: reviewId } });
    return navigate({ to: '/reviews/$snapshotId', params: { snapshotId: reviewId } });
  };

  const showMe = (item: OnboardingItem) => {
    returnFocus.current = document.activeElement;
    setTipItem(item);
    const { screen } = ONBOARDING_ITEM_GUIDES(item);
    if (screen === ONBOARDING_SCREENS.ANYWHERE || screen === screenForPath(pathname)) return;
    goTo(screen).catch((error: unknown) => showToast(getErrorMessage(error)));
  };

  const close = (shouldReturnFocus = false) => {
    setTipItem(undefined);
    const target = returnFocus.current;
    returnFocus.current = null;
    if (shouldReturnFocus && target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!tipItem) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(GUIDE_SURFACES)) return;
      close();
    };
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  });

  const screen = tipItem ? ONBOARDING_ITEM_GUIDES(tipItem).screen : undefined;
  return {
    tipItem,
    isWaitingForReview: screen !== undefined && isReviewScreen(screen) && !reviewId,
    showMe,
    close,
  };
}
