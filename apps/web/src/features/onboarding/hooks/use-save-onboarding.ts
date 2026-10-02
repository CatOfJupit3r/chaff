import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { settingsQueryOptions } from '@~/features/settings/hooks/use-settings';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iOnboardingState } from '../onboarding.types';

export function useSaveOnboarding() {
  const queryClient = useQueryClient();
  const onSuccess = (onboarding: iOnboardingState) => {
    queryClient.setQueryData(settingsQueryOptions.queryKey, (settings) =>
      settings ? { ...settings, onboarding } : settings,
    );
  };
  const options = {
    scope: { id: 'onboarding-progress' },
    onSuccess,
    onError: (error: Error) => showToast(getErrorMessage(error)),
  };
  const save = useMutation(tanstackRPC.settings.updateOnboarding.mutationOptions(options));
  const replay = useMutation(tanstackRPC.settings.replayOnboarding.mutationOptions(options));
  return { save, replay };
}
