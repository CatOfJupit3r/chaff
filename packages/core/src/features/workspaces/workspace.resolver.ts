import { singleton } from 'tsyringe';

import type { workspaces } from '@~/db/schema/workspaces.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iWorkspaceRecord } from './workspaces.types';

type WorkspaceRow = typeof workspaces.$inferSelect;

@singleton()
export class WorkspaceResolver {
  public toWorkspaceRecord = createRowResolver<WorkspaceRow, iWorkspaceRecord>({
    optional: ['defaultBranch'],
  });
}
