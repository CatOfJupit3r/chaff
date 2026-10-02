import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import type { ReviewTargetKind } from '@chaff/common/enums/review.enums';

import { idPrimaryKey, timestamps } from '../schema.helpers';
import { workspaces } from './workspaces.schema';

/**
 * A branch under review, compared against the parent the reviewer chose for it. A branch target exists
 * as soon as its parent is confirmed, before any snapshot is taken.
 */
export const reviewTargets = sqliteTable(
  'review_targets',
  {
    id: idPrimaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    branch: text('branch').notNull(),
    kind: text('kind').$type<ReviewTargetKind>().notNull().default(REVIEW_TARGET_KINDS.BRANCH),
    parentBranch: text('parent_branch').notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('review_targets_workspace_branch_kind_unique').on(table.workspaceId, table.branch, table.kind),
  ],
);
