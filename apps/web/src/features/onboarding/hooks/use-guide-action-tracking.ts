import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import type { OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { subscribeGuideActions } from '../guide-action-events';
import { itemsFromMutation, itemsFromRoute } from '../guide-tracking.utils';
import type { iGuideLocation } from '../guide-tracking.utils';
import { ONBOARDING_MUTATION_STATUSES } from '../onboarding.enums';

/**
 * Checks items off from what the user really does anywhere in the app: successful mutations, the screens and
 * views they open, and controls that report themselves.
 */
export function useGuideActionTracking(isActive: boolean, onDone: (items: readonly OnboardingItem[]) => unknown) {
  const queryClient = useQueryClient();
  const { pathname, search } = useLocation();
  const latest = useRef(onDone);
  const previousLocation = useRef<iGuideLocation>(undefined);
  useEffect(() => {
    latest.current = onDone;
  });

  useEffect(() => {
    if (!isActive) return undefined;
    const startedAt = Date.now();
    const seen = new WeakSet<object>();
    const unsubscribeMutations = queryClient.getMutationCache().subscribe(({ mutation }) => {
      if (
        mutation?.state.status !== ONBOARDING_MUTATION_STATUSES.success ||
        mutation.state.submittedAt < startedAt ||
        seen.has(mutation)
      )
        return;
      seen.add(mutation);
      const items = itemsFromMutation(mutation);
      if (items.length > 0) latest.current(items);
    });
    const unsubscribeActions = subscribeGuideActions((item) => latest.current([item]));
    return () => {
      unsubscribeMutations();
      unsubscribeActions();
    };
  }, [queryClient, isActive]);

  useEffect(() => {
    const current = { pathname, search: { ...search } };
    const items = itemsFromRoute(previousLocation.current, current);
    previousLocation.current = current;
    if (isActive && items.length > 0) latest.current(items);
  }, [pathname, search, isActive]);
}
