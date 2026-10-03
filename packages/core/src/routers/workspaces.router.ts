import { container } from 'tsyringe';

import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { base, procedure } from '@~/lib/orpc';

export const workspacesRouter = base.workspaces.router({
  list: procedure.workspaces.list.handler(async () => container.resolve(WorkspacesService).list()),

  add: procedure.workspaces.add.handler(async ({ input }) => container.resolve(WorkspacesService).add(input.path)),

  remove: procedure.workspaces.remove.handler(async ({ input }) =>
    container.resolve(WorkspacesService).remove(input.workspaceId),
  ),

  branches: procedure.workspaces.branches.handler(async ({ input }) =>
    container.resolve(WorkspacesService).listBranches(input.workspaceId),
  ),
});
