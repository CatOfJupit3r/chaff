import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@~/components/toast/toast-store';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

const STATUS_INTERVAL_MS = 15_000;

/** How agents reach this app, which one connected last, and which agents list it; read again while shown. */
export function useAgentAccessStatus() {
  return useQuery(tanstackRPC.agentAccess.status.queryOptions({ refetchInterval: STATUS_INTERVAL_MS }));
}

/** Adds the Chaff server to Claude Code or Codex with the agent's own CLI. */
export function useAddToAgent() {
  const queryClient = useQueryClient();
  return useMutation(
    tanstackRPC.agentAccess.addToAgent.mutationOptions({
      onSuccess: (status) => queryClient.setQueryData(tanstackRPC.agentAccess.status.queryKey(), status),
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
}
