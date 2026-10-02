import { oc } from '@orpc/contract';
import z from 'zod';

import { codeHostSchema } from '@chaff/common/enums/code-host.enums';
import {
  archiveReasonSchema,
  diffSideSchema,
  fileKindSchema,
  fileStatusSchema,
  REVIEW_TARGET_KINDS,
  reviewTargetKindSchema,
  symbolKindSchema,
  unitChangeSchema,
  unitKindSchema,
  unitMarkSchema,
  unitRevisionSchema,
} from '@chaff/common/enums/review.enums';

const idSchema = z.string().min(1).max(64);
const branchNameSchema = z.string().min(1).max(255);

export const snapshotSummarySchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  headSha: z.string(),
  fileCount: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  regionCount: z.number().int().nonnegative(),
  unitCount: z.number().int().nonnegative(),
  /** Units marked Looks good, Concern or Question. */
  inspectedUnitCount: z.number().int().nonnegative(),
  laterUnitCount: z.number().int().nonnegative(),
  /** Regions in units decided on or skipped on purpose; the review is complete when this reaches `regionCount`. */
  accountedRegionCount: z.number().int().nonnegative(),
  /** Units per decision; undecided units are the rest of `unitCount`. */
  markCounts: z.array(z.object({ mark: unitMarkSchema, count: z.number().int().positive() })),
  createdAt: z.date(),
});

/** The GitLab merge request or GitHub pull request a review reads. */
export const changeRequestInfoSchema = z.object({
  host: codeHostSchema,
  project: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  webUrl: z.string(),
});

export const reviewTargetSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  branch: z.string(),
  kind: reviewTargetKindSchema,
  /** The branch it is compared with; the branch itself for working changes. */
  parentBranch: z.string(),
  change: changeRequestInfoSchema.optional(),
  /** Missing until a review is started; a branch target with only a confirmed parent has none. */
  latestSnapshot: snapshotSummarySchema.optional(),
  /** Set once the review moved to History. */
  archived: z.object({ at: z.date(), reason: archiveReasonSchema }).optional(),
});

/** A started review as History lists it. */
export const reviewHistoryEntrySchema = reviewTargetSchema.extend({
  latestSnapshot: snapshotSummarySchema,
  workspaceName: z.string(),
  findingCount: z.number().int().nonnegative(),
  /** Findings still open or waiting on a fix or a check. */
  activeFindingCount: z.number().int().nonnegative(),
  /** The newest snapshot, decision or finding change. */
  lastActivityAt: z.date(),
});

export const snapshotFileSchema = z.object({
  id: z.string(),
  ordinal: z.number().int().nonnegative(),
  path: z.string(),
  /** Previous path of a renamed file. */
  oldPath: z.string().optional(),
  status: fileStatusSchema,
  kind: fileKindSchema,
  oldMode: z.string().optional(),
  newMode: z.string().optional(),
  isBinary: z.boolean(),
  /** The patch was too large to keep; only the counts are available. */
  isTooLarge: z.boolean(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  unitCount: z.number().int().nonnegative(),
  regionCount: z.number().int().nonnegative(),
});

export const snapshotSchema = snapshotSummarySchema.extend({
  targetId: z.string(),
  workspaceId: z.string(),
  branch: z.string(),
  kind: reviewTargetKindSchema,
  /** Parent the snapshot was taken against. */
  parentBranch: z.string(),
  /** Parent the review uses now; differs from `parentBranch` after the reviewer changed it. */
  targetParentBranch: z.string(),
  parentHeadSha: z.string(),
  baseSha: z.string(),
  /** Version of the newest snapshot of the same review. */
  latestVersion: z.number().int().positive(),
  /** The merge request's diff version on the host, when the host numbers them (GitLab). */
  remoteVersion: z.number().int().positive().optional(),
  change: changeRequestInfoSchema.optional(),
  files: z.array(snapshotFileSchema),
});

export const snapshotLiveStatusSchema = z.object({
  /** The branch no longer exists in the repository. */
  isBranchMissing: z.boolean(),
  /** Commits on the branch since the snapshot; zero when the branch was rewritten. */
  newCommitCount: z.number().int().nonnegative(),
  /** The branch no longer contains the snapshot's head (rebase, amend or reset). */
  isBranchRewritten: z.boolean(),
  /** The parent branch moved since the snapshot. */
  isParentMoved: z.boolean(),
  /** The reviewer picked another parent since the snapshot was taken. */
  isParentChanged: z.boolean(),
  /** Working changes only: the uncommitted work changed since the snapshot. */
  hasNewWorkingChanges: z.boolean(),
});

export const unitSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  /** Position in reading order across the snapshot. */
  ordinal: z.number().int().nonnegative(),
  kind: unitKindSchema,
  title: z.string(),
  symbolKind: symbolKindSchema.optional(),
  isExported: z.boolean(),
  change: unitChangeSchema,
  oldStartLine: z.number().int().positive().optional(),
  oldEndLine: z.number().int().positive().optional(),
  newStartLine: z.number().int().positive().optional(),
  newEndLine: z.number().int().positive().optional(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  /** Absent while the reviewer has not decided on the unit. */
  mark: unitMarkSchema.optional(),
  /** Why the reviewer skipped the unit, for a Skipped mark. */
  skipReason: z.string().optional(),
  regionCount: z.number().int().nonnegative(),
  /** The mark was kept from the previous snapshot because the unit did not change. */
  isMarkCarried: z.boolean(),
  /** How the unit compares with the previous snapshot; absent in a review's first snapshot. */
  revision: unitRevisionSchema.optional(),
});

export const unitInterdiffSchema = z.object({
  /** The earlier version of an edited unit the reviewer decided on; null when there is none. */
  reviewed: z
    .object({
      snapshotId: z.string(),
      version: z.number().int().positive(),
      headSha: z.string(),
      mark: unitMarkSchema,
      side: diffSideSchema,
      startLine: z.number().int().positive().optional(),
      endLine: z.number().int().positive().optional(),
      text: z.string(),
    })
    .nullable(),
});

export const unitDetailSchema = z.object({
  /** The unit's lines on both sides with its changes marked, as a patch; null for binary or very large files. */
  patch: z.string().nullable(),
  /** Newest commit in the review that touched the unit's file. */
  lastCommit: z.object({ sha: z.string(), author: z.string(), committedAt: z.date() }).optional(),
});

export const unitUsageSchema = z.object({
  path: z.string(),
  line: z.number().int().positive(),
  /** Line number of the first entry in `code`. */
  firstLine: z.number().int().positive(),
  code: z.array(z.string()),
  /** The file is part of the changes under review. */
  isInReview: z.boolean(),
});

const snapshotIdInput = z.object({ snapshotId: idSchema });
const unitInput = z.object({ snapshotId: idSchema, unitId: idSchema });
const fileInput = z.object({ snapshotId: idSchema, fileId: idSchema });
const MAX_CONTEXT_LINES = 50;

export const reviewsContract = oc.router({
  list: oc
    .route({
      summary: 'List reviews',
      description: 'Returns every review target, optionally for one repository, with its newest snapshot.',
    })
    .input(z.object({ workspaceId: idSchema.optional() }))
    .output(z.array(reviewTargetSchema)),

  history: oc
    .route({
      summary: 'List review history',
      description:
        'Returns every started review, newest activity first, after moving reviews whose branch is gone or whose change was merged or closed to History. A host that cannot be reached leaves its reviews as they were.',
    })
    .input(z.object({ workspaceId: idSchema.optional() }))
    .output(z.array(reviewHistoryEntrySchema)),

  start: oc
    .route({
      summary: 'Start or continue a review',
      description:
        "Opens the branch's review. The first time, Chaff copies the branch and its parent into its own store and freezes a snapshot; afterwards the newest snapshot is reused.",
    })
    .input(
      z.object({
        workspaceId: idSchema,
        branch: branchNameSchema,
        parentBranch: branchNameSchema,
        kind: reviewTargetKindSchema.default(REVIEW_TARGET_KINDS.BRANCH),
      }),
    )
    .output(z.object({ targetId: z.string(), snapshotId: z.string() })),

  setParent: oc
    .route({
      summary: "Confirm or change a branch's parent",
      description:
        'Stores the branch the review compares this branch with. Snapshots already taken stay as they are; the next update uses the new parent.',
    })
    .input(z.object({ workspaceId: idSchema, branch: branchNameSchema, parentBranch: branchNameSchema }))
    .output(z.object({ targetId: z.string(), branch: z.string(), parentBranch: z.string() })),

  refresh: oc
    .route({
      summary: 'Update a review to the newest commits',
      description:
        'Freezes a new snapshot when the branch or its parent moved since the newest one; otherwise returns the newest snapshot.',
    })
    .input(z.object({ targetId: idSchema }))
    .output(z.object({ targetId: z.string(), snapshotId: z.string(), isNew: z.boolean() })),

  snapshot: oc
    .route({
      summary: 'Get a snapshot',
      description: 'Returns a frozen snapshot with its files in reading order. A snapshot never changes.',
    })
    .input(snapshotIdInput)
    .output(snapshotSchema),

  liveStatus: oc
    .route({
      summary: 'Compare a snapshot with the repository',
      description:
        'Reads the branch and its parent from disk, or a merge request from its host, and reports what changed since the snapshot.',
    })
    .input(snapshotIdInput)
    .output(snapshotLiveStatusSchema),

  fileDiff: oc
    .route({
      summary: "Get a file's patch",
      description:
        "Returns the file's section of the snapshot diff, or null when it was too large to keep. With more context or whitespace ignored, the section is diffed again from the store.",
    })
    .input(
      fileInput.extend({
        /** Unchanged lines around each change; the snapshot keeps 3. */
        contextLines: z.number().int().min(0).max(MAX_CONTEXT_LINES).optional(),
        /** Leave out changes that only add or remove whitespace. */
        isWhitespaceIgnored: z.boolean().optional(),
      }),
    )
    .output(z.object({ patch: z.string().nullable() })),

  fileContents: oc
    .route({
      summary: "Get a file's old and new contents",
      description:
        'Returns both sides of a text file from the snapshot store so the diff can expand context. A side is null when the file did not exist there or is binary or very large.',
    })
    .input(fileInput)
    .output(z.object({ oldContents: z.string().nullable(), newContents: z.string().nullable() })),

  units: oc
    .route({
      summary: "List a snapshot's units",
      description: 'Returns every unit in reading order with the mark the reviewer gave it.',
    })
    .input(snapshotIdInput)
    .output(z.array(unitSchema)),

  unitDetail: oc
    .route({
      summary: "Get a unit's code",
      description:
        'Returns the whole unit on both sides with its changes marked, and the newest commit that touched it.',
    })
    .input(unitInput)
    .output(unitDetailSchema),

  unitInterdiff: oc
    .route({
      summary: 'Get what changed in a unit since it was reviewed',
      description:
        'For a unit edited since an earlier snapshot, returns the version the reviewer last decided on, so only what changed since then needs reading.',
    })
    .input(unitInput)
    .output(unitInterdiffSchema),

  unitUsages: oc
    .route({
      summary: 'Find where a unit is used',
      description:
        "Searches the snapshot's head for the unit's name as a whole word, outside the unit itself. Matches are by name, not by type.",
    })
    .input(unitInput)
    .output(
      z.object({
        /** The name searched for; absent when the unit has no searchable name. */
        symbol: z.string().optional(),
        usages: z.array(unitUsageSchema),
        isTruncated: z.boolean(),
      }),
    ),

  setMarks: oc
    .route({
      summary: 'Mark units',
      description:
        'Records a decision on each unit in this snapshot, or clears it when no mark is given. A Change unit is decided by marking all of its units at once. A Skipped mark carries the reason.',
    })
    .input(
      snapshotIdInput.extend({
        marks: z
          .array(
            z.object({
              unitId: idSchema,
              mark: unitMarkSchema.optional(),
              skipReason: z.string().trim().min(1).max(200).optional(),
            }),
          )
          .min(1)
          .max(5000),
      }),
    )
    .output(
      z.array(z.object({ unitId: z.string(), mark: unitMarkSchema.optional(), skipReason: z.string().optional() })),
    ),
});
