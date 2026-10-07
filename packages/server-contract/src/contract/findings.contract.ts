import { eventIterator, oc } from '@orpc/contract';
import z from 'zod';

import { codeHostSchema } from '@chaff/common/enums/code-host.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { reportSkipReasonSchema } from '@chaff/common/enums/export.enums';
import {
  anchorMatchSchema,
  diffSideSchema,
  findingAuthorSchema,
  findingEventSourceSchema,
  findingKindSchema,
  findingScopeSchema,
  findingSeveritySchema,
  findingStatusSchema,
  findingTaskStateSchema,
} from '@chaff/common/enums/review.enums';

const idSchema = z.string().min(1).max(64);
const MAX_BODY_LENGTH = 20_000;
const MAX_ANCHORS = 50;
const MAX_REPORT_LENGTH = 1_000_000;
const MAX_TASK_LENGTH = 2000;
const MAX_MESSAGE_LENGTH = 20_000;

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
  source: findingEventSourceSchema,
  /** What a coding agent said it did, from its report. */
  note: z.string().optional(),
  commits: z.array(z.string()).optional(),
  snapshotId: z.string(),
  createdAt: z.date(),
});

/** A message in the finding's discussion in Chaff. */
export const findingMessageSchema = z.object({
  id: z.string(),
  author: findingAuthorSchema,
  body: z.string(),
  /** The review's newest snapshot when it was written. */
  snapshotId: z.string(),
  createdAt: z.date(),
});

/** Where a finding was posted: a GitLab draft note or a comment in a pending GitHub review. */
export const findingPostSchema = z.object({
  host: codeHostSchema,
  remoteId: z.string(),
  url: z.string().optional(),
  /** The thread it became on the host, once seen there. */
  discussionId: z.string().optional(),
  createdAt: z.date(),
});

/** An answer on the host to a posted finding. */
export const findingReplySchema = z.object({
  remoteId: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.date(),
});

/** The finding restated as a task for a coding agent, kept apart from the comment. */
export const findingTaskSchema = z.object({
  state: findingTaskStateSchema,
  runner: digestRunnerSchema,
  task: z.string().optional(),
  /** How to tell the task is done. */
  verify: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const reportedFindingSchema = z.object({
  /** The id as the report wrote it. */
  id: z.string(),
  findingId: z.string(),
  number: z.number().int().positive(),
});

/** What an agent report changed: findings moved, findings left as they were, and ids that matched nothing. */
export const reportResultSchema = z.object({
  applied: z.array(reportedFindingSchema.extend({ status: findingStatusSchema })),
  skipped: z.array(reportedFindingSchema.extend({ reason: reportSkipReasonSchema })),
  unknown: z.array(z.string()),
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
  /** Only concerns have one, and only when the reviewer gave it. */
  severity: findingSeveritySchema.optional(),
  /** Code it is anchored to, the whole branch, or the whole stack. */
  scope: findingScopeSchema,
  /** The reviewer's comment, verbatim. */
  body: z.string(),
  /** The answer recorded for a question. */
  answer: z.string().optional(),
  /** Every status the finding went through, oldest first. */
  events: z.array(findingEventSchema),
  post: findingPostSchema.optional(),
  task: findingTaskSchema.optional(),
  /** Answers on the host since it was posted, oldest first. */
  replies: z.array(findingReplySchema),
  /** The discussion in Chaff, oldest first. */
  messages: z.array(findingMessageSchema),
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
        'Stores a concern, question or note on units or line ranges of a snapshot, quoting the code so the finding can be found again. With no anchors it applies to the whole branch, or to the whole stack when that scope is given.',
    })
    .input(
      z.object({
        snapshotId: idSchema,
        kind: findingKindSchema,
        severity: findingSeveritySchema.optional(),
        scope: findingScopeSchema.optional(),
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

  setSeverity: oc
    .route({
      summary: "Set a concern's severity",
      description: 'Sets how much a concern matters, or clears it with null.',
    })
    .input(z.object({ findingId: idSchema, severity: findingSeveritySchema.nullable() }))
    .output(findingSchema),

  fromStack: oc
    .route({
      summary: 'List findings from the rest of the stack',
      description:
        'Active concerns on the branches this review builds on, and findings about the whole stack written on its other branches. Newest first.',
    })
    .input(z.object({ snapshotId: idSchema }))
    .output(z.array(findingSchema)),

  suggestTask: oc
    .route({
      summary: 'Suggest a task for a finding',
      description:
        'Asks the coding agent picked in Settings, read-only, to restate the finding as one task no wider than the comment. Returns at once with the task being written.',
    })
    .input(z.object({ findingId: idSchema }))
    .output(findingSchema),

  acceptTask: oc
    .route({
      summary: "Accept a finding's task",
      description: 'Keeps the task as given: the suggestion as written, edited, or written by the reviewer.',
    })
    .input(
      z.object({
        findingId: idSchema,
        task: z.string().trim().min(1).max(MAX_TASK_LENGTH),
        verify: z.string().trim().max(MAX_TASK_LENGTH).optional(),
      }),
    )
    .output(findingSchema),

  discardTask: oc
    .route({
      summary: "Discard a finding's task",
      description: 'Removes the task, stopping the agent if it is still writing it.',
    })
    .input(z.object({ findingId: idSchema }))
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

  importReport: oc
    .route({
      summary: "Import a coding agent's report",
      description:
        'Reads a JSON report of findings an agent addressed. Concerns move to Fix proposed and questions to Answered, with the agent note; ids that match no finding in the repository are listed, never guessed.',
    })
    .input(z.object({ workspaceId: idSchema, report: z.string().min(1).max(MAX_REPORT_LENGTH) }))
    .output(reportResultSchema),

  reply: oc
    .route({
      summary: 'Reply on a finding',
      description:
        "Adds the reviewer's message to the finding's discussion. With shouldReopen it also reopens the finding, where reopening is allowed; otherwise the status stays.",
    })
    .input(
      z.object({
        findingId: idSchema,
        body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
        shouldReopen: z.boolean().default(false),
      }),
    )
    .output(findingSchema),

  watch: oc
    .route({
      summary: 'Watch findings',
      description:
        'Sends the ids of findings each time a reply or a coding agent changes them, so they can be read again.',
    })
    .output(eventIterator(z.object({ findingIds: z.array(z.string()) }))),

  remove: oc
    .route({
      summary: 'Delete a finding',
      description: 'Deletes a finding and its history; used to undo writing it.',
    })
    .input(z.object({ findingId: idSchema }))
    .output(z.object({ findingId: z.string() })),
});
