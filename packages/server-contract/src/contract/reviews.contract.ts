import { oc } from '@orpc/contract';
import z from 'zod';

import { fileKindSchema, fileStatusSchema } from '@chaff/common/enums/review.enums';

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
  createdAt: z.date(),
});

export const reviewTargetSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  branch: z.string(),
  parentBranch: z.string(),
  latestSnapshot: snapshotSummarySchema.optional(),
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
  parentBranch: z.string(),
  parentHeadSha: z.string(),
  baseSha: z.string(),
  /** Version of the newest snapshot of the same review. */
  latestVersion: z.number().int().positive(),
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
});

const snapshotIdInput = z.object({ snapshotId: idSchema });
const fileInput = z.object({ snapshotId: idSchema, fileId: idSchema });

export const reviewsContract = oc.router({
  list: oc
    .route({
      summary: 'List reviews',
      description: 'Returns every review target, optionally for one repository, with its newest snapshot.',
    })
    .input(z.object({ workspaceId: idSchema.optional() }))
    .output(z.array(reviewTargetSchema)),

  start: oc
    .route({
      summary: 'Start or continue a review',
      description:
        "Opens the branch's review. The first time, Chaff copies the branch and its parent into its own store and freezes a snapshot; afterwards the newest snapshot is reused.",
    })
    .input(z.object({ workspaceId: idSchema, branch: branchNameSchema, parentBranch: branchNameSchema }))
    .output(z.object({ targetId: z.string(), snapshotId: z.string() })),

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
      description: 'Reads the branch and its parent from disk and reports what changed since the snapshot.',
    })
    .input(snapshotIdInput)
    .output(snapshotLiveStatusSchema),

  fileDiff: oc
    .route({
      summary: "Get a file's patch",
      description: "Returns the file's section of the snapshot diff, or null when it was too large to keep.",
    })
    .input(fileInput)
    .output(z.object({ patch: z.string().nullable() })),

  fileContents: oc
    .route({
      summary: "Get a file's old and new contents",
      description:
        'Returns both sides of a text file from the snapshot store so the diff can expand context. A side is null when the file did not exist there or is binary or very large.',
    })
    .input(fileInput)
    .output(z.object({ oldContents: z.string().nullable(), newContents: z.string().nullable() })),
});
