import { oc } from '@orpc/contract';
import z from 'zod';

import {
  anchorMatchSchema,
  diffSideSchema,
  findingKindSchema,
  findingStatusSchema,
} from '@chaff/common/enums/review.enums';

const idSchema = z.string().min(1).max(64);
const MAX_BODY_LENGTH = 20_000;
const MAX_ANCHORS = 50;

const lineSchema = z.number().int().nonnegative();

/** Where an anchor was found in a later snapshot of the review. */
export const anchorLocationSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  version: z.number().int().positive(),
  headSha: z.string(),
  match: anchorMatchSchema,
  fileId: z.string().optional(),
  unitId: z.string().optional(),
  /** 1-based and inclusive; the end is before the start when the anchored lines were removed. */
  startLine: lineSchema.optional(),
  endLine: lineSchema.optional(),
});

export const findingEventSchema = z.object({
  status: findingStatusSchema,
  snapshotId: z.string(),
  createdAt: z.date(),
});

/** An anchor's code in one snapshot. */
export const anchorTextSchema = anchorLocationSchema.omit({ id: true }).extend({ text: z.string() });

export const findingAnchorSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  unitId: z.string().optional(),
  fileId: z.string().optional(),
  path: z.string(),
  side: diffSideSchema,
  /** 1-based and inclusive; absent for a whole file without text lines. */
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  /** The anchored lines as they were when the finding was written. */
  quote: z.string(),
  contextBefore: z.string(),
  contextAfter: z.string(),
  /** Where the anchor was found in each later snapshot, oldest first. */
  locations: z.array(anchorLocationSchema),
});

export const findingSchema = z.object({
  id: z.string(),
  /** Shown as F-<number>; stable within the repository. */
  number: z.number().int().positive(),
  kind: findingKindSchema,
  status: findingStatusSchema,
  /** The reviewer's comment, verbatim. */
  body: z.string(),
  /** The answer recorded for a question. */
  answer: z.string().optional(),
  /** Every status the finding went through, oldest first. */
  events: z.array(findingEventSchema),
  workspaceId: z.string(),
  targetId: z.string(),
  branch: z.string(),
  parentBranch: z.string(),
  snapshotId: z.string(),
  anchors: z.array(findingAnchorSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const anchorInputSchema = z.union([
  z.object({ unitId: idSchema }),
  z
    .object({
      fileId: idSchema,
      side: diffSideSchema,
      startLine: z.number().int().positive(),
      endLine: z.number().int().positive(),
    })
    .refine((anchor) => anchor.endLine >= anchor.startLine, { message: 'endLine must not be before startLine' }),
]);

export const findingsContract = oc.router({
  list: oc
    .route({
      summary: 'List findings',
      description: 'Returns findings, newest first, for one repository or one review.',
    })
    .input(z.object({ workspaceId: idSchema.optional(), targetId: idSchema.optional() }))
    .output(z.array(findingSchema)),

  create: oc
    .route({
      summary: 'Write a finding',
      description:
        'Stores a concern, question or note on units or line ranges of a snapshot, quoting the code so the finding can be found again. With no anchors it applies to the whole branch.',
    })
    .input(
      z.object({
        snapshotId: idSchema,
        kind: findingKindSchema,
        body: z.string().trim().min(1).max(MAX_BODY_LENGTH),
        anchors: z.array(anchorInputSchema).max(MAX_ANCHORS),
      }),
    )
    .output(findingSchema),

  setStatus: oc
    .route({
      summary: 'Move a finding on',
      description:
        "Verifies, reopens, answers, closes, withdraws or reopens a finding by hand, recorded against the review's newest snapshot. Answering a question needs the answer.",
    })
    .input(
      z.object({
        findingId: idSchema,
        status: findingStatusSchema,
        answer: z.string().trim().min(1).max(MAX_BODY_LENGTH).optional(),
      }),
    )
    .output(findingSchema),

  convertToConcern: oc
    .route({
      summary: 'Turn a question into a concern',
      description: 'Makes an active question an open concern, keeping its comment and anchors.',
    })
    .input(z.object({ findingId: idSchema }))
    .output(findingSchema),

  compare: oc
    .route({
      summary: "Compare a finding's code before and after",
      description:
        'Returns, per anchor, the code as it was when the finding was last raised and as it is in the newest snapshot it was looked for in.',
    })
    .input(z.object({ findingId: idSchema }))
    .output(
      z.array(
        z.object({
          anchorId: z.string(),
          path: z.string(),
          side: diffSideSchema,
          before: anchorTextSchema,
          /** Null until a newer snapshot of the review exists. */
          after: anchorTextSchema.nullable(),
        }),
      ),
    ),

  remove: oc
    .route({
      summary: 'Delete a finding',
      description: 'Deletes a finding and its history; used to undo writing it.',
    })
    .input(z.object({ findingId: idSchema }))
    .output(z.object({ findingId: z.string() })),
});
