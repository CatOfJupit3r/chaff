import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { ChangeUnitSource } from '@chaff/common/enums/review.enums';

import { idPrimaryKey, timestampColumn } from '../schema.helpers';
import { snapshots, units } from './snapshots.schema';

/**
 * A Change unit: one behavior or design change, made of Function and Section units that may sit in several
 * files. Proposed by the digest or made by the reviewer, who can split, merge, rename and reorder them.
 */
export const changeUnits = sqliteTable(
  'change_units',
  {
    id: idPrimaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    title: text('title').notNull(),
    source: text('source').$type<ChangeUnitSource>().notNull(),
    /** The digest group it started from, so the card can show the digest's explanation. */
    digestGroupId: text('digest_group_id'),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('change_units_snapshot_ordinal_idx').on(table.snapshotId, table.ordinal)],
);

/** A unit in a Change unit. A unit belongs to at most one Change unit. */
export const changeUnitMembers = sqliteTable(
  'change_unit_members',
  {
    unitId: text('unit_id')
      .primaryKey()
      .references(() => units.id, { onDelete: 'cascade' }),
    changeUnitId: text('change_unit_id')
      .notNull()
      .references(() => changeUnits.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
  },
  (table) => [index('change_unit_members_change_idx').on(table.changeUnitId, table.ordinal)],
);
