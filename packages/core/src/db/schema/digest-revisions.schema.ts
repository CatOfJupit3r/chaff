import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { DigestPart, DigestRunner, DigestStatus } from '@chaff/common/enums/digest.enums';

import { idPrimaryKey, timestampColumn } from '../schema.helpers';
import { digests } from './digests.schema';

/**
 * A version of one part of a digest (its overview, a unit's note or a diagram) rewritten by a coding agent on
 * the reviewer's instructions. Every version is kept; at most one per part is selected, and none means the
 * digest's own.
 */
export const digestRevisions = sqliteTable(
  'digest_revisions',
  {
    id: idPrimaryKey(),
    digestId: text('digest_id')
      .notNull()
      .references(() => digests.id, { onDelete: 'cascade' }),
    part: text('part').$type<DigestPart>().notNull(),
    /** The unit id of a unit note, the diagram id of a diagram; null for the overview. */
    partId: text('part_id'),
    instructions: text('instructions').notNull(),
    runner: text('runner').$type<DigestRunner>().notNull(),
    model: text('model'),
    status: text('status').$type<DigestStatus>().notNull(),
    progress: text('progress'),
    error: text('error'),
    /** The checked part as JSON, once it is ready. */
    content: text('content'),
    isSelected: integer('is_selected', { mode: 'boolean' }).notNull().default(false),
    startedAt: timestampColumn('started_at')
      .notNull()
      .$defaultFn(() => new Date()),
    finishedAt: timestampColumn('finished_at'),
  },
  (table) => [index('digest_revisions_digest_idx').on(table.digestId, table.startedAt)],
);
