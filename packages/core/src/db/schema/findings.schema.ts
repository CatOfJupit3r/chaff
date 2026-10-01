import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { DiffSide, FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';

import { idPrimaryKey, timestampColumn, timestamps } from '../schema.helpers';
import { reviewTargets } from './review-targets.schema';
import { snapshotFiles, snapshots, units } from './snapshots.schema';
import { workspaces } from './workspaces.schema';

/** Something the reviewer flagged. The comment is kept verbatim. */
export const findings = sqliteTable(
  'findings',
  {
    id: idPrimaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    /** Shown as F-<number>; stable within the repository. */
    number: integer('number').notNull(),
    /** The branch where the flagged code was introduced. */
    targetId: text('target_id')
      .notNull()
      .references(() => reviewTargets.id, { onDelete: 'cascade' }),
    /** Snapshot the finding was written on. */
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<FindingKind>().notNull(),
    status: text('status').$type<FindingStatus>().notNull(),
    body: text('body').notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('findings_workspace_number_unique').on(table.workspaceId, table.number),
    index('findings_target_idx').on(table.targetId),
  ],
);

/** Where a finding points: a line range on one side of a file, quoted so it can be found again after rewrites. */
export const findingAnchors = sqliteTable(
  'finding_anchors',
  {
    id: idPrimaryKey(),
    findingId: text('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    unitId: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
    fileId: text('file_id').references(() => snapshotFiles.id, { onDelete: 'set null' }),
    path: text('path').notNull(),
    side: text('side').$type<DiffSide>().notNull(),
    /** 1-based and inclusive; null when the anchor is a whole file without text lines. */
    startLine: integer('start_line'),
    endLine: integer('end_line'),
    quote: text('quote').notNull(),
    contextBefore: text('context_before').notNull(),
    contextAfter: text('context_after').notNull(),
  },
  (table) => [
    index('finding_anchors_finding_idx').on(table.findingId),
    index('finding_anchors_unit_idx').on(table.unitId),
  ],
);

/** Every status a finding went through, with the snapshot it happened on. */
export const findingEvents = sqliteTable(
  'finding_events',
  {
    id: idPrimaryKey(),
    findingId: text('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    status: text('status').$type<FindingStatus>().notNull(),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('finding_events_finding_idx').on(table.findingId)],
);
