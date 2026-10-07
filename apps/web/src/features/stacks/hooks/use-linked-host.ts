import { useQuery } from '@tanstack/react-query';

import { useConnections } from '@~/features/code-hosts/hooks/use-connections';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

/** The code host of the project the repository is linked to, if any; stacks are imported from it. */
export function useLinkedHost(workspace: iWorkspace | undefined) {
  const connections = useConnections();
  const { data: remote } = useQuery(
    tanstackRPC.codeHosts.workspaceRemote.queryOptions({
      input: { workspaceId: workspace?.id ?? '' },
      enabled: workspace !== undefined && connections.length > 0,
    }),
  );
  return connections.find((connection) => connection.id === remote?.connectionId)?.host;
}
