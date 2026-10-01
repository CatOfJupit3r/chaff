import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { FileKind, FileStatus, SymbolKind, UnitChange, UnitKind } from '@chaff/common/enums/review.enums';

import { idPrimaryKey, timestampColumn } from '../schema.helpers';
import { reviewTargets } from './review-targets.schema';

/** A frozen version of a review target. The commits are pinned in the workspace's snapshot store. */
export const snapshots = sqliteTable(
  'snapshots',
  {
    id: idPrimaryKey(),
    targetId: text('target_id')
      .notNull()
      .references(() => reviewTargets.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    parentBranch: text('parent_branch').notNull(),
    headSha: text('head_sha').notNull(),
    parentHeadSha: text('parent_head_sha').notNull(),
    /** Merge base of the head and the parent head; the diff runs from here to the head. */
    baseSha: text('base_sha').notNull(),
    fileCount: integer('file_count').notNull(),
    additions: integer('additions').notNull(),
    deletions: integer('deletions').notNull(),
    regionCount: integer('region_count').notNull(),
    unitCount: integer('unit_count').notNull(),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('snapshots_target_version_unique').on(table.targetId, table.version)],
);

export const snapshotFiles = sqliteTable(
  'snapshot_files',
  {
    id: idPrimaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    /** Position in reading order. */
    ordinal: integer('ordinal').notNull(),
    path: text('path').notNull(),
    /** Previous path, set only for renames. */
    oldPath: text('old_path'),
    status: text('status').$type<FileStatus>().notNull(),
    kind: text('kind').$type<FileKind>().notNull(),
    oldMode: text('old_mode'),
    newMode: text('new_mode'),
    oldBlobSha: text('old_blob_sha'),
    newBlobSha: text('new_blob_sha'),
    isBinary: integer('is_binary', { mode: 'boolean' }).notNull(),
    additions: integer('additions').notNull(),
    deletions: integer('deletions').notNull(),
    /** The file's section of `git diff`; null when it was too large to keep. */
    patch: text('patch'),
    isTooLarge: integer('is_too_large', { mode: 'boolean' }).notNull(),
  },
  (table) => [index('snapshot_files_snapshot_ordinal_idx').on(table.snapshotId, table.ordinal)],
);

export const units = sqliteTable(
  'units',
  {
    id: idPrimaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
      .notNull()
      .references(() => snapshotFiles.id, { onDelete: 'cascade' }),
    /** Position in reading order across the whole snapshot. */
    ordinal: integer('ordinal').notNull(),
    /** Identifies the same unit in another snapshot of the target: the file plus the symbol path or section content. */
    key: text('key').notNull(),
    kind: text('kind').$type<UnitKind>().notNull(),
    title: text('title').notNull(),
    symbolKind: text('symbol_kind').$type<SymbolKind>(),
    isExported: integer('is_exported', { mode: 'boolean' }).notNull(),
    change: text('change').$type<UnitChange>().notNull(),
    /** Lines the unit spans on each side, 1-based and inclusive; null on a side where it does not exist. */
    oldStartLine: integer('old_start_line'),
    oldEndLine: integer('old_end_line'),
    newStartLine: integer('new_start_line'),
    newEndLine: integer('new_end_line'),
    additions: integer('additions').notNull(),
    deletions: integer('deletions').notNull(),
    contentHash: text('content_hash').notNull(),
  },
  (table) => [index('units_snapshot_ordinal_idx').on(table.snapshotId, table.ordinal)],
);

/**
 * The atomic unit of change: a contiguous run of changed lines in one hunk that belongs to a single unit.
 * Binary, generated, rename-only and mode-only changes get one file-level region with no line range.
 */
export const regions = sqliteTable(
  'regions',
  {
    id: idPrimaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    fileId: text('file_id')
      .notNull()
      .references(() => snapshotFiles.id, { onDelete: 'cascade' }),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    isFileLevel: integer('is_file_level', { mode: 'boolean' }).notNull(),
    /**
     * First old and new line of the run. A side without changed lines points at the line the change sits
     * before on that side. Null for file-level regions.
     */
    oldStartLine: integer('old_start_line'),
    newStartLine: integer('new_start_line'),
    deletions: integer('deletions').notNull(),
    additions: integer('additions').notNull(),
    contentHash: text('content_hash').notNull(),
  },
  (table) => [
    index('regions_snapshot_ordinal_idx').on(table.snapshotId, table.ordinal),
    index('regions_unit_idx').on(table.unitId),
  ],
);
