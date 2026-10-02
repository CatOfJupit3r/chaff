import { oc } from '@orpc/contract';
import z from 'zod';

import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { fixStatusSchema } from '@chaff/common/enums/fix.enums';

import { reportResultSchema } from './findings.contract';

const idSchema = z.string().min(1).max(64);
const MAX_FINDING_IDS = 500;

export const fixFileSchema = z.object({
  path: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

export const fixSchema = z.object({
  id: z.string(),
  targetId: z.string(),
  snapshotId: z.string(),
  runner: digestRunnerSchema,
  status: fixStatusSchema,
  progress: z.string().optional(),
  error: z.string().optional(),
  /** Branch in Chaff's store that holds the agent's changes. */
  branch: z.string(),
  baseSha: z.string(),
  /** Head of that branch once the agent finished; equal to `baseSha` when it changed nothing. */
  headSha: z.string().optional(),
  findingIds: z.array(z.string()),
  findingNumbers: z.array(z.number().int().positive()),
  files: z.array(fixFileSchema),
  /** The agent's last message. */
  summary: z.string().optional(),
  /** What the agent's report changed on the findings. */
  report: reportResultSchema.optional(),
  /** The checkout the agent worked in, kept until the fix is discarded. */
  checkoutPath: z.string(),
  /** A git command that copies the fix's branch into the user's repository, for the user to run. */
  fetchCommand: z.string(),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
});

export const fixesContract = oc.router({
  list: oc
    .route({
      summary: "List a review's fixes",
      description: 'Returns the fix hand-offs of the review the snapshot belongs to, newest first.',
    })
    .input(z.object({ snapshotId: idSchema }))
    .output(z.array(fixSchema)),

  start: oc
    .route({
      summary: 'Hand findings to an agent to fix',
      description:
        "Starts the chosen coding agent with write access on the review's open concerns and questions, in a new checkout of the newest snapshot on a new branch of Chaff's store. It runs in the background; poll `list` for progress. The user's repository is not touched.",
    })
    .input(
      z.object({
        snapshotId: idSchema,
        runner: digestRunnerSchema,
        /** Narrows the hand-off to these findings. */
        findingIds: z.array(idSchema).max(MAX_FINDING_IDS).optional(),
      }),
    )
    .output(fixSchema),

  cancel: oc
    .route({ summary: 'Stop a fix', description: 'Stops the agent. What it changed so far stays in the checkout.' })
    .input(z.object({ fixId: idSchema }))
    .output(fixSchema),

  discard: oc
    .route({
      summary: 'Discard a fix',
      description: "Deletes the fix's checkout and its branch in Chaff's store. Findings keep their history.",
    })
    .input(z.object({ fixId: idSchema }))
    .output(z.object({ fixId: z.string() })),

  patch: oc
    .route({ summary: "Read a fix's changes", description: 'Returns the unified diff the agent made.' })
    .input(z.object({ fixId: idSchema }))
    .output(z.object({ patch: z.string() })),
});
