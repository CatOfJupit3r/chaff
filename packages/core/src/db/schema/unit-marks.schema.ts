import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { UnitMark } from '@chaff/common/enums/review.enums';

import { timestampColumn } from '../schema.helpers';
import { snapshots, units } from './snapshots.schema';

/** The reviewer's decision on a unit. A unit without a row is untouched. */
export const unitMarks = sqliteTable(
  'unit_marks',
  {
    unitId: text('unit_id')
      .primaryKey()
      .references(() => units.id, { onDelete: 'cascade' }),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    mark: text('mark').$type<UnitMark>().notNull(),
    updatedAt: timestampColumn('updated_at')
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [index('unit_marks_snapshot_idx').on(table.snapshotId)],
);
