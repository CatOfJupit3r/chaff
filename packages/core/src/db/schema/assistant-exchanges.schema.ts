import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { AnswerStatus } from '@chaff/common/enums/assistant.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { idPrimaryKey, timestampColumn } from '../schema.helpers';
import { snapshots } from './snapshots.schema';

/**
 * A question the reviewer asked a coding agent about one Focus card, and its answer. A card's exchanges,
 * oldest first, are its thread, and each answer is written knowing the ones before it.
 */
export const assistantExchanges = sqliteTable(
  'assistant_exchanges',
  {
    id: idPrimaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    /** The Change unit's id, or the unit's id, of the card. */
    cardId: text('card_id').notNull(),
    question: text('question').notNull(),
    /** Markdown, written as it streams in. */
    answer: text('answer'),
    status: text('status').$type<AnswerStatus>().notNull(),
    progress: text('progress'),
    error: text('error'),
    runner: text('runner').$type<DigestRunner>().notNull(),
    model: text('model'),
    askedAt: timestampColumn('asked_at')
      .notNull()
      .$defaultFn(() => new Date()),
    answeredAt: timestampColumn('answered_at'),
  },
  (table) => [index('assistant_exchanges_card_idx').on(table.snapshotId, table.cardId, table.askedAt)],
);
