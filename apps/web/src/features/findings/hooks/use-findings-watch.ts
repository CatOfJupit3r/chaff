import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import client from '@~/utils/orpc';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** Reads findings again whenever a reply or a coding agent changes them, wherever they are on screen. */
export function useFindingsWatch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const controller = new AbortController();
    const follow = async () => {
      const changes = await client.findings.watch(undefined, { signal: controller.signal });
      for await (const change of changes) {
        if (change.findingIds.length > 0) await queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() });
      }
    };
    follow().catch(() => undefined);
    return () => controller.abort();
  }, [queryClient]);
}
