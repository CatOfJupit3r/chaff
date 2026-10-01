import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { idPrimaryKey, timestamps } from '../schema.helpers';
import { workspaces } from './workspaces.schema';

/** A branch under review, compared against the parent branch the reviewer chose for it. */
export const reviewTargets = sqliteTable(
  'review_targets',
  {
    id: idPrimaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    branch: text('branch').notNull(),
    parentBranch: text('parent_branch').notNull(),
    ...timestamps(),
  },
  (table) => [uniqueIndex('review_targets_workspace_branch_unique').on(table.workspaceId, table.branch)],
);
