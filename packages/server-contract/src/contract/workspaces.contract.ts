import { oc } from '@orpc/contract';
import z from 'zod';

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
  /** `feature` for a local branch, `origin/feature` for a remote-tracking branch with no local branch. */
  name: z.string(),
  /** Only on the remote: pushed, or fetched from someone else, but never checked out here. */
  isRemote: z.boolean(),
  headSha: z.string(),
  subject: z.string(),
  authorName: z.string(),
  committedAt: z.date(),
  upstream: z.string().optional(),
  isDefault: z.boolean(),
  /**
   * Nearest branch whose tip, or a commit it had when this branch left it, is in this branch's history; the
   * default branch when none is.
   */
  suggestedParent: z.string().optional(),
  /** Commits between where this branch left the suggested parent and this branch's tip. */
  commitsAhead: z.number().int().nonnegative(),
  /** The parent the branch is reviewed against: the confirmed one, else the suggestion. */
  parent: z.string().optional(),
  isParentConfirmed: z.boolean(),
  /** The parent, other than the default branch, has commits this branch doesn't contain yet. */
  isParentMoved: z.boolean(),
  /** Folder of the worktree the branch is checked out in, if any. */
  worktreePath: z.string().optional(),
  /** The branch is checked out and has uncommitted changes. */
  hasWorkingChanges: z.boolean(),
});

const workspaceIdInput = z.object({ workspaceId: z.string().min(1).max(64) });

export const workspacesContract = oc.router({
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

  branchStat: oc
    .route({
      summary: "Count a branch's changes",
      description:
        'Files, added lines and deleted lines between where the branch left its parent and its tip, read from disk before any snapshot exists.',
    })
    .input(
      workspaceIdInput.extend({
        branch: z.string().min(1).max(255),
        parentBranch: z.string().min(1).max(255),
      }),
    )
    .output(
      z.object({
        fileCount: z.number().int().nonnegative(),
        additions: z.number().int().nonnegative(),
        deletions: z.number().int().nonnegative(),
      }),
    ),
});
