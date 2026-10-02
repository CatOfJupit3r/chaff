import { container } from 'tsyringe';

import { ChangeRequestsService } from '@~/features/code-hosts/change-requests.service';
import { ConnectionsService } from '@~/features/code-hosts/connections.service';
import { RemoteProjectsService } from '@~/features/code-hosts/remote-projects.service';
import { base, procedure } from '@~/lib/orpc';

export const codeHostsRouter = base.codeHosts.router({
  connections: procedure.codeHosts.connections.handler(async () => container.resolve(ConnectionsService).list()),

  connect: procedure.codeHosts.connect.handler(async ({ input }) => container.resolve(ConnectionsService).add(input)),

  disconnect: procedure.codeHosts.disconnect.handler(async ({ input }) =>
    container.resolve(ConnectionsService).remove(input.connectionId),
  ),

  workspaceRemote: procedure.codeHosts.workspaceRemote.handler(async ({ input }) =>
    container.resolve(RemoteProjectsService).describe(input.workspaceId),
  ),

  setWorkspaceRemote: procedure.codeHosts.setWorkspaceRemote.handler(async ({ input }) =>
    container.resolve(RemoteProjectsService).set(input.workspaceId, input.remote),
  ),

  inbox: procedure.codeHosts.inbox.handler(async ({ input }) =>
    container.resolve(ChangeRequestsService).inbox(input.filter),
  ),

  startChange: procedure.codeHosts.startChange.handler(async ({ input }) =>
    container.resolve(ChangeRequestsService).start(input.workspaceId, input.number),
  ),

  linkChange: procedure.codeHosts.linkChange.handler(async ({ input }) =>
    container.resolve(ChangeRequestsService).link(input.targetId, input.number),
  ),

  discussions: procedure.codeHosts.discussions.handler(async ({ input }) =>
    container.resolve(ChangeRequestsService).discussions(input.snapshotId),
  ),
});
