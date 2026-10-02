import { singleton } from 'tsyringe';
import z from 'zod';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';

import { getAllPages, getJson } from './code-host-http';
import type { iCodeHostAccess, iCodeHostProvider, iRemoteChange, iRemoteDiscussion } from './code-hosts.types';

const userSchema = z.object({ username: z.string(), name: z.string().optional() });

const mergeRequestSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string().nullish(),
  author: userSchema,
  source_branch: z.string(),
  target_branch: z.string(),
  sha: z.string().nullish(),
  web_url: z.string(),
  draft: z.boolean().optional(),
  work_in_progress: z.boolean().optional(),
  updated_at: z.string(),
  assignees: z.array(userSchema).nullish(),
  reviewers: z.array(userSchema).nullish(),
});

const positionSchema = z.object({
  new_path: z.string().nullish(),
  old_path: z.string().nullish(),
  new_line: z.number().nullish(),
  old_line: z.number().nullish(),
  head_sha: z.string().nullish(),
});

const discussionSchema = z.object({
  id: z.string(),
  notes: z.array(
    z.object({
      id: z.number(),
      body: z.string(),
      author: userSchema,
      created_at: z.string(),
      system: z.boolean().optional(),
      resolvable: z.boolean().optional(),
      resolved: z.boolean().optional(),
      position: positionSchema.nullish(),
    }),
  ),
});

function toChange(request: z.infer<typeof mergeRequestSchema>): iRemoteChange {
  return {
    number: request.iid,
    title: request.title,
    description: request.description ?? '',
    authorName: request.author.name ?? request.author.username,
    authorUsername: request.author.username,
    sourceBranch: request.source_branch,
    targetBranch: request.target_branch,
    headSha: request.sha ?? '',
    webUrl: request.web_url,
    isDraft: request.draft ?? request.work_in_progress ?? false,
    updatedAt: new Date(request.updated_at),
    assigneeUsernames: (request.assignees ?? []).map((user) => user.username),
    reviewerUsernames: (request.reviewers ?? []).map((user) => user.username),
  };
}

function toDiscussion(discussion: z.infer<typeof discussionSchema>, webUrl: string): iRemoteDiscussion | undefined {
  const notes = discussion.notes.filter((note) => !note.system);
  const [first] = notes;
  if (!first) return undefined;
  const { position } = first;
  return {
    id: discussion.id,
    path: position?.new_path ?? position?.old_path ?? undefined,
    newLine: position?.new_line ?? undefined,
    oldLine: position?.old_line ?? undefined,
    commitSha: position?.head_sha ?? undefined,
    isResolved: notes.some((note) => note.resolvable) && notes.every((note) => !note.resolvable || note.resolved),
    webUrl: `${webUrl}#note_${first.id}`,
    notes: notes.map((note) => ({
      id: String(note.id),
      authorName: note.author.name ?? note.author.username,
      body: note.body,
      createdAt: new Date(note.created_at),
    })),
  };
}

/** GitLab's REST API (v4), on gitlab.com or a self-managed instance. */
@singleton()
export class GitLabProvider implements iCodeHostProvider {
  public readonly host = CODE_HOSTS.GITLAB;

  public async currentUser(access: iCodeHostAccess) {
    const user = await getJson(this.request(access, '/user'), userSchema);
    return { username: user?.username ?? '' };
  }

  public async listChanges(access: iCodeHostAccess, project: string) {
    const requests = await getAllPages(
      this.request(access, `${this.projectPath(project)}/merge_requests?state=opened&per_page=100&order_by=updated_at`),
      z.array(mergeRequestSchema),
    );
    return requests.map(toChange);
  }

  public async getChange(access: iCodeHostAccess, project: string, changeNumber: number) {
    const request = await getJson(
      this.request(access, `${this.projectPath(project)}/merge_requests/${changeNumber}`),
      mergeRequestSchema,
    );
    return request ? toChange(request) : undefined;
  }

  public async listChangeCommits(access: iCodeHostAccess, project: string, changeNumber: number) {
    const commits = await getAllPages(
      this.request(access, `${this.projectPath(project)}/merge_requests/${changeNumber}/commits?per_page=100`),
      z.array(z.object({ id: z.string() })),
    );
    return commits.map((commit) => commit.id);
  }

  public async branchHead(access: iCodeHostAccess, project: string, branch: string) {
    const found = await getJson(
      this.request(access, `${this.projectPath(project)}/repository/branches/${encodeURIComponent(branch)}`),
      z.object({ commit: z.object({ id: z.string() }) }),
    );
    return found?.commit.id;
  }

  public async listDiscussions(access: iCodeHostAccess, project: string, changeNumber: number) {
    const change = await this.getChange(access, project, changeNumber);
    const discussions = await getAllPages(
      this.request(access, `${this.projectPath(project)}/merge_requests/${changeNumber}/discussions?per_page=100`),
      z.array(discussionSchema),
    );
    return discussions.flatMap((discussion) => toDiscussion(discussion, change?.webUrl ?? '') ?? []);
  }

  public async cloneUrl(access: iCodeHostAccess, project: string) {
    const found = await getJson(
      this.request(access, this.projectPath(project)),
      z.object({ http_url_to_repo: z.string() }),
    );
    return found?.http_url_to_repo ?? `${access.baseUrl}/${project}.git`;
  }

  public changeRef(changeNumber: number) {
    return `refs/merge-requests/${changeNumber}/head`;
  }

  public gitAuthorization(token: string) {
    return `Basic ${Buffer.from(`oauth2:${token}`).toString('base64')}`;
  }

  private projectPath(project: string) {
    return `/projects/${encodeURIComponent(project)}`;
  }

  private request(access: iCodeHostAccess, pathname: string) {
    return {
      url: `${access.baseUrl}/api/v4${pathname}`,
      headers: { Authorization: `Bearer ${access.token}`, Accept: 'application/json' },
    };
  }
}
