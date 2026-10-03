import { oc } from '@orpc/contract';
import z from 'zod';

import { codeHostSchema } from '@chaff/common/enums/code-host.enums';
import { exportScopeSchema } from '@chaff/common/enums/export.enums';
import { findingKindSchema, findingStatusSchema } from '@chaff/common/enums/review.enums';

const idSchema = z.string().min(1).max(64);
const MAX_FINDING_IDS = 500;

const selectionSchema = z.object({
  snapshotId: idSchema,
  /** Findings at these statuses are included. */
  statuses: z.array(findingStatusSchema).max(16),
  /** Narrows the selection to these findings. */
  findingIds: z.array(idSchema).max(MAX_FINDING_IDS).optional(),
});

export const exportsContract = oc.router({
  packet: oc
    .route({
      summary: 'Export findings',
      description:
        'Writes the findings of a review, its stack or the repository as Markdown, as JSON with full anchors, and as a prompt for a coding agent that asks for a report Chaff can import.',
    })
    .input(
      selectionSchema.extend({
        scope: exportScopeSchema,
        shouldQuoteCode: z.boolean(),
        shouldListUnreviewed: z.boolean(),
      }),
    )
    .output(
      z.object({
        markdown: z.string(),
        json: z.string(),
        agentPrompt: z.string(),
        findingCount: z.number().int().nonnegative(),
        reviewCount: z.number().int().nonnegative(),
        /** Findings in scope at each status, whatever statuses were chosen. */
        statusCounts: z.array(z.object({ status: findingStatusSchema, count: z.number().int().positive() })),
      }),
    ),

  postingPreview: oc
    .route({
      summary: 'Preview posting findings',
      description:
        "Shows how a merge or pull request review's findings would be posted, which diff line each lands on, and the same calls as glab or gh and curl commands.",
    })
    .input(selectionSchema)
    .output(
      z.object({
        host: codeHostSchema,
        changeNumber: z.number().int().nonnegative(),
        webUrl: z.string().optional(),
        /** False when the host has no version of the change at the snapshot's head, so nothing can sit on a line. */
        isSnapshotOnHost: z.boolean(),
        items: z.array(
          z.object({
            findingId: z.string(),
            number: z.number().int().positive(),
            kind: findingKindSchema,
            path: z.string().optional(),
            /** The diff line the comment goes on; absent when it goes on the change as a whole. */
            line: z.number().int().positive().optional(),
            isPosted: z.boolean(),
            postedUrl: z.string().optional(),
          }),
        ),
        cliCommand: z.string(),
        curlCommand: z.string(),
      }),
    ),

  post: oc
    .route({
      summary: 'Post findings as a draft review',
      description:
        'Creates GitLab draft notes or one pending GitHub review from the findings not posted yet. Nothing is published or submitted; the reviewer does that on the host.',
    })
    .input(selectionSchema)
    .output(z.object({ postedCount: z.number().int().nonnegative(), url: z.string().optional() })),
});
