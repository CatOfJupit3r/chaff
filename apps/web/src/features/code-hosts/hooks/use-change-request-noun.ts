import { CHANGE_REQUEST_NOUNS } from '@chaff/common/enums/code-host.enums';

import { useConnections } from './use-connections';
import { useWorkspaceRemote } from './use-workspace-remote';

/** "merge request" or "pull request", after the host of the repository's linked project; undefined until known. */
export function useChangeRequestNoun(workspaceId: string) {
  const { remote } = useWorkspaceRemote(workspaceId);
  const connections = useConnections();
  const host = connections.find((connection) => connection.id === remote?.connectionId)?.host;
  return host ? CHANGE_REQUEST_NOUNS.get(host) : undefined;
}
