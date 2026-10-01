import { oc } from '@orpc/contract';
import z from 'zod';

import { diffSideSchema, findingKindSchema, findingStatusSchema } from '@chaff/common/enums/review.enums';

const idSchema = z.string().min(1).max(64);
const MAX_BODY_LENGTH = 20_000;
const MAX_ANCHORS = 50;

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
});

export const findingSchema = z.object({
  id: z.string(),
  /** Shown as F-<number>; stable within the repository. */
  number: z.number().int().positive(),
  kind: findingKindSchema,
  status: findingStatusSchema,
  /** The reviewer's comment, verbatim. */
  body: z.string(),
  targetId: z.string(),
  branch: z.string(),
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
      summary: 'Withdraw or reopen a finding',
      description: 'Withdraws an active finding, or opens a withdrawn one again, recorded against the given snapshot.',
    })
    .input(z.object({ findingId: idSchema, snapshotId: idSchema, status: findingStatusSchema }))
    .output(findingSchema),

  remove: oc
    .route({
      summary: 'Delete a finding',
      description: 'Deletes a finding and its history; used to undo writing it.',
    })
    .input(z.object({ findingId: idSchema }))
    .output(z.object({ findingId: z.string() })),
});
