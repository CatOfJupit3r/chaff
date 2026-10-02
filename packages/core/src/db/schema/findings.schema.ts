import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { FINDING_EVENT_SOURCES, FINDING_SCOPES } from '@chaff/common/enums/review.enums';
import type {
  AnchorMatch,
  DiffSide,
  FindingEventSource,
  FindingKind,
  FindingScope,
  FindingSeverity,
  FindingStatus,
  FindingTaskState,
} from '@chaff/common/enums/review.enums';

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
    /** Set only on concerns, and only when the reviewer gave one. */
    severity: text('severity').$type<FindingSeverity>(),
    scope: text('scope').$type<FindingScope>().notNull().default(FINDING_SCOPES.CODE),
    body: text('body').notNull(),
    /** The answer the reviewer recorded for a question. */
    answer: text('answer'),
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
    source: text('source').$type<FindingEventSource>().notNull().default(FINDING_EVENT_SOURCES.REVIEWER),
    /** What a coding agent said it did, from its report. */
    note: text('note'),
    /** Commits a coding agent's report named. */
    commits: text('commits', { mode: 'json' }).$type<string[]>(),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index('finding_events_finding_idx').on(table.findingId)],
);

/**
 * Where an anchor was found again in a later snapshot of the review. The text and context are those of the
 * located lines, so the next snapshot is compared with the newest code rather than the original quote.
 */
export const findingAnchorLocations = sqliteTable(
  'finding_anchor_locations',
  {
    id: idPrimaryKey(),
    anchorId: text('anchor_id')
      .notNull()
      .references(() => findingAnchors.id, { onDelete: 'cascade' }),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    match: text('match').$type<AnchorMatch>().notNull(),
    fileId: text('file_id').references(() => snapshotFiles.id, { onDelete: 'set null' }),
    unitId: text('unit_id').references(() => units.id, { onDelete: 'set null' }),
    /** 1-based and inclusive; the end is before the start when the anchored lines were removed. */
    startLine: integer('start_line'),
    endLine: integer('end_line'),
    text: text('text').notNull(),
    contextBefore: text('context_before').notNull(),
    contextAfter: text('context_after').notNull(),
  },
  (table) => [uniqueIndex('finding_anchor_locations_anchor_snapshot_unique').on(table.anchorId, table.snapshotId)],
);

/** A finding posted to its merge or pull request: a GitLab draft note, or a comment in a pending GitHub review. */
export const findingPosts = sqliteTable(
  'finding_posts',
  {
    id: idPrimaryKey(),
    findingId: text('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    host: text('host').$type<CodeHost>().notNull(),
    /** The draft note's id on GitLab, the pending review's id on GitHub. */
    remoteId: text('remote_id').notNull(),
    url: text('url'),
    createdAt: timestampColumn('created_at')
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('finding_posts_finding_unique').on(table.findingId)],
);

/**
 * A finding restated as a task for a coding agent, proposed by an agent and kept apart from the
 * reviewer's comment, which is never rewritten. The reviewer accepts it as is or edited, or discards it.
 */
export const findingTasks = sqliteTable('finding_tasks', {
  findingId: text('finding_id')
    .primaryKey()
    .references(() => findings.id, { onDelete: 'cascade' }),
  state: text('state').$type<FindingTaskState>().notNull(),
  runner: text('runner').$type<DigestRunner>().notNull(),
  task: text('task'),
  /** How to tell the task is done. */
  verify: text('verify'),
  error: text('error'),
  ...timestamps(),
});
