import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { DigestRunner, DigestStatus } from '@chaff/common/enums/digest.enums';

import { idPrimaryKey, timestampColumn } from '../schema.helpers';
import { snapshots } from './snapshots.schema';

/**
 * An AI digest of one snapshot, written by a coding agent on this machine in a read-only checkout.
 * The checked result is kept as JSON; a snapshot never changes, so neither does its digest.
 */
export const digests = sqliteTable(
  'digests',
  {
    id: idPrimaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    runner: text('runner').$type<DigestRunner>().notNull(),
    /** The model the agent was asked to use; null when it used its own default. */
    model: text('model'),
    status: text('status').$type<DigestStatus>().notNull(),
    /** What the agent is doing now, while it runs. */
    progress: text('progress'),
    error: text('error'),
    /** The checked digest as JSON, once it is ready. */
    content: text('content'),
    /** What has arrived of the answer as JSON, while it is being written. */
    preview: text('preview'),
    startedAt: timestampColumn('started_at')
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: timestampColumn('finished_at'),
  },
  (table) => [index('digests_snapshot_idx').on(table.snapshotId, table.startedAt)],
);
