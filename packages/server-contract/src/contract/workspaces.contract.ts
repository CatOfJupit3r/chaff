import { oc } from '@orpc/contract';
import z from 'zod';

import {
  stackActivitySchema,
  stackReviewFilterSchema,
  stackSourceSchema,
} from '@chaff/common/enums/stack-filters.enums';

const branchNameSchema = z.string().min(1).max(255);

/** How a repository's stack list is narrowed down. */
export const stackFiltersSchema = z.object({
  activity: stackActivitySchema,
  review: stackReviewFilterSchema,
  source: stackSourceSchema,
  /** Only stacks with commits by the user. */
  isMineOnly: z.boolean(),
});

export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  repoPath: z.string(),
  defaultBranch: z.string().optional(),
  /** False when the folder was moved or deleted since it was added. */
  isAvailable: z.boolean(),
  stackFilters: stackFiltersSchema,
  createdAt: z.date(),
});

export const branchSchema = z.object({
  /** Branch name without the remote, also for a remote-tracking branch with no local branch (see `remote`). */
  name: z.string(),
  headSha: z.string(),
  subject: z.string(),
  authorName: z.string(),
  committedAt: z.date(),
  upstream: z.string().optional(),
  /**
   * Set when the branch only exists as a remote-tracking branch (`refs/remotes/<remote>/<name>`), to the remote
   * it is read from; local branches leave it out.
   */
  remote: z.string().optional(),
  isDefault: z.boolean(),
  /**
   * The user, by the repository's configured git user or their own emails, wrote at least one of the commits the
   * default branch doesn't have yet. Read for local branches and branches of stacks only.
   */
  isAuthoredByUser: z.boolean(),
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

  updateStackView: oc
    .route({
      summary: "Change a repository's stack list",
      description: 'Saves the filters of the stack list.',
    })
    .input(workspaceIdInput.extend({ stackFilters: stackFiltersSchema }))
    .output(workspaceSchema),

  branches: oc
    .route({
      summary: 'List branches',
      description:
        'Reads every local branch of the repository from disk, plus the remote-tracking branches with no local branch that the default branch has not merged or that belong to a stack, newest commit first.',
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
        branch: branchNameSchema,
        parentBranch: branchNameSchema,
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
