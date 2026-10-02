import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The models a coding agent offers; the core asks the agent once per session, and `refresh` asks it again. */
export function useAgentModels(runner: DigestRunner, isEnabled: boolean) {
  const queryClient = useQueryClient();
  const options = tanstackRPC.digests.models.queryOptions({
    input: { runner },
    enabled: isEnabled,
    staleTime: Infinity,
  });
  const query = useQuery(options);
  const refresh = useMutation(
    tanstackRPC.digests.models.mutationOptions({
      onSuccess: (list) => queryClient.setQueryData(options.queryKey, list),
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );

  return {
    list: query.data,
    isLoading: query.isPending && isEnabled,
    isRefreshing: refresh.isPending,
    refresh: () => refresh.mutate({ runner, shouldRefresh: true }),
  };
}
