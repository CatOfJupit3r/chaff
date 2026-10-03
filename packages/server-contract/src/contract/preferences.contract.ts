import { oc } from '@orpc/contract';
import z from 'zod';

const idSchema = z.string().min(1).max(64);
const MAX_PREFERENCE_LENGTH = 2000;

const preferenceTextSchema = z.string().trim().min(1).max(MAX_PREFERENCE_LENGTH);

export const preferenceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  text: z.string(),
  /** The finding it was promoted from. */
  findingId: z.string().optional(),
  findingNumber: z.number().int().positive().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const preferencesContract = oc.router({
  list: oc
    .route({ summary: "List a repository's preferences", description: 'Oldest first, as they are exported.' })
    .input(z.object({ workspaceId: idSchema }))
    .output(z.array(preferenceSchema)),

  create: oc
    .route({
      summary: 'Add a preference',
      description:
        'Stores a project preference for the repository, optionally promoted from a finding. Preferences go into digests and agent prompts.',
    })
    .input(z.object({ workspaceId: idSchema, text: preferenceTextSchema, findingId: idSchema.optional() }))
    .output(preferenceSchema),

  update: oc
    .route({ summary: 'Reword a preference', description: "Changes a preference's text." })
    .input(z.object({ preferenceId: idSchema, text: preferenceTextSchema }))
    .output(preferenceSchema),

  remove: oc
    .route({ summary: 'Delete a preference', description: 'The finding it came from is kept.' })
    .input(z.object({ preferenceId: idSchema }))
    .output(z.object({ preferenceId: z.string() })),

  snippet: oc
    .route({
      summary: 'Export preferences for CLAUDE.md',
      description: "The repository's preferences as a Markdown section to paste into CLAUDE.md or AGENTS.md.",
    })
    .input(z.object({ workspaceId: idSchema }))
    .output(z.object({ markdown: z.string(), count: z.number().int().nonnegative() })),
});
