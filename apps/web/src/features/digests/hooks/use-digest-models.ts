import { useQuery } from '@tanstack/react-query';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Asking an agent for its models starts its CLI, so the answer is kept for a while. */
const MODELS_STALE_MS = 10 * 60 * 1000;

/** The models the runner can write a digest with; only asked for while the dialog is open. */
export function useDigestModels(runner: DigestRunner, isEnabled: boolean) {
  return useQuery(
    tanstackRPC.digests.models.queryOptions({
      input: { runner },
      staleTime: MODELS_STALE_MS,
      enabled: isEnabled,
    }),
  );
}
