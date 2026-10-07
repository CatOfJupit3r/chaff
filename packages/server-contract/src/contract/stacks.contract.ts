import { oc } from '@orpc/contract';
import z from 'zod';

import { codeHostSchema } from '@chaff/common/enums/code-host.enums';
import {
  stackEndSchema,
  stackHostChangeKindSchema,
  stackSuggestionSourceSchema,
} from '@chaff/common/enums/stack.enums';

import { remoteChangeSchema } from './code-hosts.contract';

const idSchema = z.string().min(1).max(64);
const branchNameSchema = z.string().min(1).max(255);
const changeNumberSchema = z.number().int().positive();
const MAX_IMPORTED_BRANCHES = 50;

/** One branch of a stack and how it sits on the branch it merges into. */
export const stackMemberSchema = z.object({
  branch: z.string(),
  /** Branch it merges into: the one below it, or the stack's base for the bottom branch; unset until chosen. */
  parentBranch: z.string().optional(),
  /** Commits on the branch that its parent doesn't have; zero while either branch is missing. */
  commitsAhead: z.number().int().nonnegative(),
  /** The parent, other than the default branch, has commits this branch doesn't contain yet. */
  isParentMoved: z.boolean(),
  /** The branch no longer exists in the repository, locally or on a remote. */
  isMissing: z.boolean(),
  /** The branch's open merge or pull request on the linked project. */
  change: remoteChangeSchema.optional(),
});

export const stackSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  /** Branch the bottom branch merges into; unset until the user picks it. */
  baseBranch: z.string().optional(),
  isHidden: z.boolean(),
  /** Bottom first. */
  branches: z.array(stackMemberSchema),
  /** The project the repository's merge or pull requests are read from, when one is linked. */
  remote: z.object({ host: codeHostSchema, project: z.string() }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** A branch that could go next on one end of a stack. */
export const stackSuggestionSchema = z.object({
  branch: z.string(),
  source: stackSuggestionSourceSchema,
  /** The default branch below the bottom one: the stack merges into it rather than taking it in. */
  isBase: z.boolean(),
  /** How many suggestions before it in a chain from the host must be applied first; zero applies now. */
  step: z.number().int().nonnegative(),
  /** The suggested branch's own open change. */
  change: remoteChangeSchema.optional(),
  /** The open change that links the suggestion to the stack: its source merges into its target. */
  linkChange: remoteChangeSchema.optional(),
  /** Commits between the end of the stack and the suggested branch, for suggestions read from the history. */
  commitsApart: z.number().int().nonnegative().optional(),
  /** Another stack of the repository holds the branch, so it cannot be added. */
  stackId: z.string().optional(),
});

/** A chain of open changes on the host, each targeting the one below it, that can become a stack. */
export const stackImportSchema = z.object({
  /** Branch the bottom change targets. */
  baseBranch: z.string(),
  /** Bottom first. */
  branches: z.array(z.object({ branch: z.string(), change: remoteChangeSchema })),
  /** Branches of the chain that already belong to a stack, which keeps the chain from being imported. */
  stackedBranches: z.array(z.object({ branch: z.string(), stackId: z.string() })),
});

/** Where the code host differs from a stack, to apply or set aside one at a time. */
export const stackHostChangeSchema = z.object({
  kind: stackHostChangeKindSchema,
  /** The branch the change is about: the one to add on top, or the stack's branch that was retargeted. */
  branch: z.string(),
  change: remoteChangeSchema,
  /** For a retargeted branch, the branch it merges into in the stack. */
  stackParent: z.string().optional(),
});

const stackIdInput = z.object({ stackId: idSchema });
const workspaceIdInput = z.object({ workspaceId: idSchema });

export const stacksContract = oc.router({
  list: oc
    .route({
      summary: "List a repository's stacks",
      description:
        'Returns the stacks the user built in the repository, newest first, each with its branches bottom first and how every branch sits on the one it merges into.',
    })
    .input(workspaceIdInput)
    .output(z.array(stackSchema)),

  create: oc
    .route({
      summary: 'Start a stack',
      description:
        'Starts a stack holding one branch, with no base yet. Fails with BRANCH_ALREADY_STACKED when another stack holds the branch.',
    })
    .input(workspaceIdInput.extend({ branch: branchNameSchema }))
    .output(stackSchema),

  import: oc
    .route({
      summary: 'Import a stack from the code host',
      description:
        'Creates a stack from a chain of open changes, bottom first, ending on the branch the bottom change targets. Nothing changes on the host. Fails with BRANCH_ALREADY_STACKED when a branch of the chain belongs to a stack.',
    })
    .input(
      workspaceIdInput.extend({
        branches: z.array(branchNameSchema).min(1).max(MAX_IMPORTED_BRANCHES),
        baseBranch: branchNameSchema,
      }),
    )
    .output(stackSchema),

  importable: oc
    .route({
      summary: 'List chains of open changes',
      description:
        "Reads the linked project's open merge or pull requests and returns every chain of them, each targeting the one below it, most recently updated first. Empty when the repository has no linked project.",
    })
    .input(workspaceIdInput)
    .output(z.array(stackImportSchema)),

  addBranch: oc
    .route({
      summary: 'Add a branch to a stack',
      description:
        'Puts the branch on top of the stack, merging into the top branch, or at the bottom, merging into the base. Fails with BRANCH_ALREADY_STACKED when a stack holds the branch and INVALID_STACK_BASE when it is the base.',
    })
    .input(stackIdInput.extend({ branch: branchNameSchema, end: stackEndSchema }))
    .output(stackSchema),

  removeBranch: oc
    .route({
      summary: 'Take a branch out of a stack',
      description:
        'The branch above it then merges into the branch below it. Removing the last branch removes the stack, which then resolves with null.',
    })
    .input(stackIdInput.extend({ branch: branchNameSchema }))
    .output(stackSchema.nullable()),

  setBase: oc
    .route({
      summary: "Choose a stack's base",
      description:
        "Sets the branch the bottom branch merges into, or clears it with null. Fails with INVALID_STACK_BASE when the base is one of the stack's branches.",
    })
    .input(stackIdInput.extend({ baseBranch: branchNameSchema.nullable() }))
    .output(stackSchema),

  setHidden: oc
    .route({ summary: 'Hide or show a stack', description: 'Hidden stacks leave the stack list until shown again.' })
    .input(stackIdInput.extend({ isHidden: z.boolean() }))
    .output(stackSchema),

  remove: oc
    .route({
      summary: 'Remove a stack',
      description: 'Forgets the stack; its branches, reviews and the repository are not touched.',
    })
    .input(stackIdInput)
    .output(z.object({ stackId: z.string() })),

  suggest: oc
    .route({
      summary: 'Suggest the next branch of a stack',
      description:
        "Branches that could go on top of the stack or below its bottom branch: the linked project's open changes first, as a chain applied one step at a time, then the nearest branches in the history. Below the bottom, the default branch comes last, as the branch the stack merges into.",
    })
    .input(stackIdInput.extend({ end: stackEndSchema }))
    .output(z.array(stackSuggestionSchema)),

  hostChanges: oc
    .route({
      summary: 'Compare a stack with the code host',
      description:
        "Open changes now targeting the stack's top branch, and the stack's branches whose change targets another branch than the one they merge into here. Changes the user set aside are left out.",
    })
    .input(stackIdInput)
    .output(z.array(stackHostChangeSchema)),

  followHostParent: oc
    .route({
      summary: "Follow a branch's change target",
      description:
        "Makes the branch merge into its change's target: the branches between them leave the stack, or, when the target is not in the stack, every branch below leaves and the target becomes the base.",
    })
    .input(stackIdInput.extend({ branch: branchNameSchema }))
    .output(stackSchema),

  keepParent: oc
    .route({
      summary: "Keep a branch's parent over its change target",
      description:
        "Stops reporting that the branch's change targets another branch, until the change is retargeted again.",
    })
    .input(stackIdInput.extend({ branch: branchNameSchema }))
    .output(stackSchema),

  dismissChange: oc
    .route({
      summary: 'Set aside an open change',
      description: 'Stops suggesting the open change on top of the stack.',
    })
    .input(stackIdInput.extend({ changeNumber: changeNumberSchema }))
    .output(stackSchema),
});
