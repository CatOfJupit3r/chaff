import { oc } from '@orpc/contract';
import z from 'zod';

import { codeHostSchema, inboxFilterSchema } from '@chaff/common/enums/code-host.enums';

const idSchema = z.string().min(1).max(64);
const changeNumberSchema = z.number().int().positive();
/** Two or more path segments, such as `group/project` or `owner/repo`. */
const projectSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[\w.-]+(?:\/[\w.-]+)+$/);

export const connectionSchema = z.object({
  id: z.string(),
  host: codeHostSchema,
  baseUrl: z.string(),
  username: z.string(),
  createdAt: z.date(),
});

export const workspaceRemoteSchema = z
  .object({
    connectionId: z.string(),
    project: z.string(),
    /** Read from the repository's remotes rather than chosen in Settings. */
    isDetected: z.boolean(),
  })
  .nullable();

export const remoteChangeSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  description: z.string(),
  authorName: z.string(),
  authorUsername: z.string(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
  headSha: z.string(),
  webUrl: z.string(),
  isDraft: z.boolean(),
  updatedAt: z.date(),
  assigneeUsernames: z.array(z.string()),
  reviewerUsernames: z.array(z.string()),
});

export const inboxProjectSchema = z.object({
  workspaceId: z.string(),
  connectionId: z.string(),
  host: codeHostSchema,
  project: z.string(),
  changes: z.array(remoteChangeSchema),
  /** Why the project's changes could not be read; the rest of the inbox still loads. */
  error: z.string().nullable(),
});

export const discussionSchema = z.object({
  id: z.string(),
  path: z.string().optional(),
  newLine: z.number().int().optional(),
  oldLine: z.number().int().optional(),
  commitSha: z.string().optional(),
  isResolved: z.boolean(),
  webUrl: z.string().optional(),
  /** False when the thread was written against another version of the change. */
  isOnSnapshot: z.boolean(),
  notes: z.array(z.object({ id: z.string(), authorName: z.string(), body: z.string(), createdAt: z.date() })),
});

export const codeHostsContract = oc.router({
  connections: oc
    .route({ summary: 'List GitLab and GitHub connections', description: 'Tokens are never included.' })
    .output(z.array(connectionSchema)),

  connect: oc
    .route({
      summary: 'Connect GitLab or GitHub',
      description:
        'Checks the token against the host, then keeps it encrypted in the OS keychain. Connecting the same address again replaces its token.',
    })
    .input(
      z.object({
        host: codeHostSchema,
        baseUrl: z.string().max(512).optional(),
        token: z.string().min(1).max(512),
      }),
    )
    .output(connectionSchema),

  disconnect: oc
    .route({ summary: 'Remove a connection', description: 'Deletes the connection and its stored token.' })
    .input(z.object({ connectionId: idSchema }))
    .output(z.object({ isRemoved: z.boolean() })),

  workspaceRemote: oc
    .route({
      summary: "Get a repository's project",
      description: 'The GitLab or GitHub project chosen for the repository, or the one detected from its remotes.',
    })
    .input(z.object({ workspaceId: idSchema }))
    .output(workspaceRemoteSchema),

  setWorkspaceRemote: oc
    .route({
      summary: "Choose a repository's project",
      description: 'Links the repository to a project by hand; null goes back to detecting it from the remotes.',
    })
    .input(
      z.object({
        workspaceId: idSchema,
        remote: z.object({ connectionId: idSchema, project: projectSchema }).nullable(),
      }),
    )
    .output(workspaceRemoteSchema),

  inbox: oc
    .route({
      summary: 'List open merge requests',
      description:
        'Open merge requests and pull requests of every repository with a project: assigned to you or awaiting your review, yours, or all.',
    })
    .input(z.object({ filter: inboxFilterSchema }))
    .output(z.array(inboxProjectSchema)),

  startChange: oc
    .route({
      summary: 'Review a merge request',
      description:
        "Copies the merge request and its target branch from the host into Chaff's store and opens its newest snapshot.",
    })
    .input(z.object({ workspaceId: idSchema, number: changeNumberSchema }))
    .output(z.object({ targetId: z.string(), snapshotId: z.string() })),

  linkChange: oc
    .route({
      summary: 'Link a local review to its merge request',
      description:
        "Moves a local branch's review, with its snapshots, decisions and findings, onto the merge request it was pushed as.",
    })
    .input(z.object({ targetId: idSchema, number: changeNumberSchema }))
    .output(z.object({ targetId: z.string() })),

  discussions: oc
    .route({
      summary: "Read a merge request's discussions",
      description: 'Threads from the host, read-only. Empty for reviews of local branches.',
    })
    .input(z.object({ snapshotId: idSchema }))
    .output(z.array(discussionSchema)),
});
