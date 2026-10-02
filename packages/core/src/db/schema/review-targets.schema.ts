import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import type { ArchiveReason, ReviewTargetKind } from '@chaff/common/enums/review.enums';

import { idPrimaryKey, timestampColumn, timestamps } from '../schema.helpers';
import { workspaces } from './workspaces.schema';

/**
 * A branch under review, compared against the parent the reviewer chose for it. A branch target exists
 * as soon as its parent is confirmed, before any snapshot is taken. A merge or pull request is reviewed
 * against its target branch.
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
    /** Set for a merge or pull request: where it lives and its number there. */
    codeHost: text('code_host').$type<CodeHost>(),
    connectionId: text('connection_id'),
    remoteProject: text('remote_project'),
    changeNumber: integer('change_number'),
    title: text('title'),
    webUrl: text('web_url'),
    /** Set once the branch is gone or the change was merged or closed; the review then lives in History. */
    archivedAt: timestampColumn('archived_at'),
    archiveReason: text('archive_reason').$type<ArchiveReason>(),
    ...timestamps(),
  },
  (table) => [
    // Pull requests from forks can share a branch name, so a change is unique by its number instead.
    uniqueIndex('review_targets_workspace_branch_kind_unique')
      .on(table.workspaceId, table.branch, table.kind)
      .where(sql`${table.changeNumber} is null`),
    uniqueIndex('review_targets_workspace_change_unique')
      .on(table.workspaceId, table.changeNumber)
      .where(sql`${table.changeNumber} is not null`),
  ],
);
