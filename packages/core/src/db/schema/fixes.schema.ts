import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import type { FixStatus } from '@chaff/common/enums/fix.enums';

import { idPrimaryKey, timestampColumn } from '../schema.helpers';
import { reviewTargets } from './review-targets.schema';
import { snapshots } from './snapshots.schema';

/**
 * A fix hand-off: a coding agent with write access worked on a review's findings in a checkout of the
 * snapshot's head, on a new branch of Chaff's store. The user's repository is never written.
 */
export const fixes = sqliteTable(
  'fixes',
  {
    id: idPrimaryKey(),
    targetId: text('target_id')
      .notNull()
      .references(() => reviewTargets.id, { onDelete: 'cascade' }),
    /** The snapshot whose head the agent started from. */
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    runner: text('runner').$type<DigestRunner>().notNull(),
    status: text('status').$type<FixStatus>().notNull(),
    progress: text('progress'),
    error: text('error'),
    /** Branch in the store that holds the agent's changes. */
    branch: text('branch').notNull(),
    baseSha: text('base_sha').notNull(),
    /** The branch's head once Chaff committed what the agent changed. */
    headSha: text('head_sha'),
    /** JSON array of the finding ids handed to the agent. */
    findingIds: text('finding_ids', { mode: 'json' }).$type<string[]>().notNull(),
    /** JSON array of `{ path, additions, deletions }` between the base and the head. */
    files: text('files', { mode: 'json' }).$type<{ path: string; additions: number; deletions: number }[]>(),
    /** The agent's last message. */
    summary: text('summary'),
    /** JSON of what its report changed on the findings. */
    report: text('report'),
    startedAt: timestampColumn('started_at')
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: timestampColumn('finished_at'),
  },
  (table) => [index('fixes_target_idx').on(table.targetId, table.startedAt)],
);
