// Example: Creating an oRPC contract with input/output schemas
// Location: packages/server-contract/src/contract/workspaces.contract.ts

import { oc } from '@orpc/contract';
import z from 'zod';

// Define reusable schemas
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  repoPath: z.string(),
  defaultBranch: z.string().optional(),
  /** False when the folder was moved or deleted since it was added. */
  isAvailable: z.boolean(),
  createdAt: z.date(),
});

export const branchSchema = z.object({
  name: z.string(),
  headSha: z.string(),
  subject: z.string(),
  authorName: z.string(),
  committedAt: z.date(),
  upstream: z.string().optional(),
  isDefault: z.boolean(),
  /** Nearest branch whose tip is in this branch's history; the default branch when none is. */
  suggestedParent: z.string().optional(),
  /** First-parent commits between the suggested parent's tip and this branch's tip. */
  commitsAhead: z.number().int().nonnegative(),
});

// Input shared by every procedure that targets one workspace
const workspaceIdInput = z.object({ workspaceId: z.string().min(1).max(64) });

// Export the contract router
export const workspacesContract = oc.router({
  // A procedure without parameters has no .input()
  list: oc
    .route({
      summary: 'List repositories',
      description: 'Returns every repository added to Chaff, oldest first.',
    })
    .output(z.array(workspaceSchema)),

  add: oc
    .route({
      summary: 'Add a repository',
      description:
        'Adds the git repository that contains the given folder. Chaff only reads it and never writes to it.',
    })
    .input(z.object({ path: z.string().min(1).max(4096) }))
    .output(workspaceSchema),

  remove: oc
    .route({
      summary: 'Remove a repository',
      description: 'Forgets the repository and its reviews. The folder on disk is not touched.',
    })
    .input(workspaceIdInput)
    .output(z.object({ workspaceId: z.string() })),

  branches: oc
    .route({
      summary: 'List local branches',
      description:
        'Reads every local branch of the repository from disk, newest commit first, with a suggested parent for each.',
    })
    .input(workspaceIdInput)
    .output(z.array(branchSchema)),
});
