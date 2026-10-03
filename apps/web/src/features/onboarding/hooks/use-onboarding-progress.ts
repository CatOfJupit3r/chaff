import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';

import { ONBOARDING_STATUSES } from '@chaff/common/enums/onboarding.enums';
import type { OnboardingHint, OnboardingItem } from '@chaff/common/enums/onboarding.enums';

import { showToast } from '@~/components/toast/toast-store';
import { settingsQueryOptions } from '@~/features/settings/hooks/use-settings';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { isGuideExpandedAtom, isGuideFinishShownAtom, openGuideItemAtom } from '../onboarding.store';
import type { iOnboardingState } from '../onboarding.types';
import { firstOpenItem, isGuideActive, withCompletedItems } from '../onboarding.utils';

const PROGRESS_SCOPE = { id: 'onboarding-progress' };

/**
 * Reads and saves the checklist through the settings cache, so changes made in quick succession build on each
 * other instead of on a stale copy.
 */
export function useOnboardingProgress() {
  const queryClient = useQueryClient();
  const setIsExpanded = useSetAtom(isGuideExpandedAtom);
  const setIsFinishShown = useSetAtom(isGuideFinishShownAtom);
  const setOpenItem = useSetAtom(openGuideItemAtom);
  const read = () => queryClient.getQueryData(settingsQueryOptions.queryKey)?.onboarding;
  const write = (onboarding: iOnboardingState) =>
    queryClient.setQueryData(settingsQueryOptions.queryKey, (settings) =>
      settings ? { ...settings, onboarding } : settings,
    );
  const onError = (error: Error) => showToast(getErrorMessage(error));
  const save = useMutation(
    tanstackRPC.settings.updateOnboarding.mutationOptions({
      scope: PROGRESS_SCOPE,
      onError: async (error) => {
        onError(error);
        await queryClient.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      },
    }),
  );
  const replay = useMutation(
    tanstackRPC.settings.replayOnboarding.mutationOptions({
      scope: PROGRESS_SCOPE,
      onSuccess: (onboarding) => {
        write(onboarding);
        setIsFinishShown(false);
        setOpenItem(firstOpenItem(onboarding.completedItems));
        setIsExpanded(true);
      },
      onError,
    }),
  );
  const commit = (change: (state: iOnboardingState) => iOnboardingState | undefined) => {
    const current = read();
    const next = current ? change(current) : undefined;
    if (!next) return;
    write(next);
    save.mutate(next);
  };

  const complete = (items: readonly OnboardingItem[]) =>
    commit((state) => {
      if (!isGuideActive(state) || items.every((item) => state.completedItems.includes(item))) return undefined;
      const next = withCompletedItems(state, items);
      if (next.status === ONBOARDING_STATUSES.COMPLETED) {
        setIsFinishShown(true);
        setIsExpanded(true);
      }
      return next;
    });

  const start = () => {
    commit((state) => ({ ...state, status: ONBOARDING_STATUSES.IN_PROGRESS }));
    setOpenItem(firstOpenItem(read()?.completedItems ?? []));
    setIsExpanded(true);
  };

  const skip = () => {
    setIsFinishShown(false);
    commit((state) => ({ ...state, status: ONBOARDING_STATUSES.SKIPPED }));
  };

  const markHintShown = (hint: OnboardingHint) =>
    commit((state) =>
      state.shownHints.includes(hint) ? undefined : { ...state, shownHints: [...state.shownHints, hint] },
    );

  return { complete, start, skip, markHintShown, replay };
}
