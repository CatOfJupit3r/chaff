import { container } from 'tsyringe';

import { StackHostService } from '@~/features/stacks/stack-host.service';
import { StackSuggestionsService } from '@~/features/stacks/stack-suggestions.service';
import { StacksService } from '@~/features/stacks/stacks.service';
import { base, procedure } from '@~/lib/orpc';

export const stacksRouter = base.stacks.router({
  list: procedure.stacks.list.handler(async ({ input }) => container.resolve(StacksService).list(input.workspaceId)),

  create: procedure.stacks.create.handler(async ({ input }) => container.resolve(StacksService).create(input)),

  import: procedure.stacks.import.handler(async ({ input }) => container.resolve(StacksService).import(input)),

  importable: procedure.stacks.importable.handler(async ({ input }) =>
    container.resolve(StackHostService).importable(input.workspaceId),
  ),

  addBranch: procedure.stacks.addBranch.handler(async ({ input }) => container.resolve(StacksService).addBranch(input)),

  removeBranch: procedure.stacks.removeBranch.handler(async ({ input }) =>
    container.resolve(StacksService).removeBranch(input),
  ),

  setBase: procedure.stacks.setBase.handler(async ({ input }) => container.resolve(StacksService).setBase(input)),

  setHidden: procedure.stacks.setHidden.handler(async ({ input }) => container.resolve(StacksService).setHidden(input)),

  remove: procedure.stacks.remove.handler(async ({ input }) => container.resolve(StacksService).remove(input.stackId)),

  suggest: procedure.stacks.suggest.handler(async ({ input }) =>
    container.resolve(StackSuggestionsService).suggest(input),
  ),

  hostChanges: procedure.stacks.hostChanges.handler(async ({ input }) =>
    container.resolve(StackHostService).hostChanges(input.stackId),
  ),

  followHostParent: procedure.stacks.followHostParent.handler(async ({ input }) =>
    container.resolve(StackHostService).followHostParent(input),
  ),

  keepParent: procedure.stacks.keepParent.handler(async ({ input }) =>
    container.resolve(StackHostService).keepParent(input),
  ),

  dismissChange: procedure.stacks.dismissChange.handler(async ({ input }) =>
    container.resolve(StackHostService).dismissChange(input),
  ),
});
