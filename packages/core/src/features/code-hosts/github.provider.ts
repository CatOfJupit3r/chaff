import { singleton } from 'tsyringe';
import z from 'zod';

import { CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { DIFF_SIDES } from '@chaff/common/enums/review.enums';

import { ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { getAllPages, getJson, postJson } from './code-host-http';
import type {
  iCodeHostAccess,
  iCodeHostProvider,
  iHostWrite,
  iRemoteChange,
  iRemoteDiscussion,
  iReviewDraft,
} from './code-hosts.types';

const GITHUB_WEB_URL = 'https://github.com';
const GITHUB_API_URL = 'https://api.github.com';
const PENDING_REVIEW_ERROR = /pending review/i;
const COMMENT_SEPARATOR = '\n\n---\n\n';

const userSchema = z.object({ login: z.string(), name: z.string().nullish() });

const pullSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullish(),
  user: userSchema,
  head: z.object({ ref: z.string(), sha: z.string() }),
  base: z.object({ ref: z.string() }),
  html_url: z.string(),
  draft: z.boolean().optional(),
  updated_at: z.string(),
  assignees: z.array(userSchema).nullish(),
  requested_reviewers: z.array(userSchema).nullish(),
});

const reviewCommentSchema = z.object({
  id: z.number(),
  in_reply_to_id: z.number().nullish(),
  path: z.string(),
  line: z.number().nullish(),
  original_line: z.number().nullish(),
  side: z.string().nullish(),
  commit_id: z.string().nullish(),
  body: z.string(),
  user: userSchema,
  created_at: z.string(),
  html_url: z.string(),
});

const issueCommentSchema = z.object({
  id: z.number(),
  body: z.string().nullish(),
  user: userSchema,
  created_at: z.string(),
  html_url: z.string(),
});

function toChange(pull: z.infer<typeof pullSchema>): iRemoteChange {
  return {
    number: pull.number,
    title: pull.title,
    description: pull.body ?? '',
    authorName: pull.user.name ?? pull.user.login,
    authorUsername: pull.user.login,
    sourceBranch: pull.head.ref,
    targetBranch: pull.base.ref,
    headSha: pull.head.sha,
    webUrl: pull.html_url,
    isDraft: pull.draft ?? false,
    updatedAt: new Date(pull.updated_at),
    assigneeUsernames: (pull.assignees ?? []).map((user) => user.login),
    reviewerUsernames: (pull.requested_reviewers ?? []).map((user) => user.login),
  };
}

/** Review comments become threads by following `in_reply_to_id` to the first comment. */
function threadReviewComments(comments: z.infer<typeof reviewCommentSchema>[]): iRemoteDiscussion[] {
  const threads = new Map<number, iRemoteDiscussion>();
  for (const comment of comments) {
    const note = {
      id: String(comment.id),
      authorName: comment.user.name ?? comment.user.login,
      body: comment.body,
      createdAt: new Date(comment.created_at),
    };
    const parent = comment.in_reply_to_id ? threads.get(comment.in_reply_to_id) : undefined;
    if (parent) {
      parent.notes.push(note);
      threads.set(comment.id, parent);
      continue;
    }
    const line = comment.line ?? comment.original_line ?? undefined;
    const isOldSide = comment.side === 'LEFT';
    threads.set(comment.id, {
      id: `review-${comment.id}`,
      path: comment.path,
      newLine: isOldSide ? undefined : line,
      oldLine: isOldSide ? line : undefined,
      commitSha: comment.commit_id ?? undefined,
      isResolved: false,
      webUrl: comment.html_url,
      notes: [note],
    });
  }
  return [...new Set(threads.values())];
}

/** GitHub's REST API, on github.com or GitHub Enterprise Server. */
@singleton()
export class GitHubProvider implements iCodeHostProvider {
  public readonly host = CODE_HOSTS.GITHUB;

  public async currentUser(access: iCodeHostAccess) {
    const user = await getJson(this.request(access, '/user'), userSchema);
    return { username: user?.login ?? '' };
  }

  public async listChanges(access: iCodeHostAccess, project: string) {
    const pulls = await getAllPages(
      this.request(access, `/repos/${project}/pulls?state=open&per_page=100&sort=updated&direction=desc`),
      z.array(pullSchema),
    );
    return pulls.map(toChange);
  }

  public async getChange(access: iCodeHostAccess, project: string, changeNumber: number) {
    const pull = await getJson(this.request(access, `/repos/${project}/pulls/${changeNumber}`), pullSchema);
    return pull ? toChange(pull) : undefined;
  }

  public async getIssue(access: iCodeHostAccess, project: string, issueNumber: number) {
    const issue = await getJson(
      this.request(access, `/repos/${project}/issues/${issueNumber}`),
      z.object({ number: z.number(), title: z.string(), body: z.string().nullish() }),
    );
    return issue ? { number: issue.number, title: issue.title, description: issue.body ?? '' } : undefined;
  }

  public async listChangeCommits(access: iCodeHostAccess, project: string, changeNumber: number) {
    const commits = await getAllPages(
      this.request(access, `/repos/${project}/pulls/${changeNumber}/commits?per_page=100`),
      z.array(z.object({ sha: z.string() })),
    );
    return commits.map((commit) => commit.sha).toReversed();
  }

  public async branchHead(access: iCodeHostAccess, project: string, branch: string) {
    const found = await getJson(
      this.request(access, `/repos/${project}/branches/${encodeURIComponent(branch)}`),
      z.object({ commit: z.object({ sha: z.string() }) }),
    );
    return found?.commit.sha;
  }

  public async listDiscussions(access: iCodeHostAccess, project: string, changeNumber: number) {
    const [reviewComments, issueComments] = await Promise.all([
      getAllPages(
        this.request(access, `/repos/${project}/pulls/${changeNumber}/comments?per_page=100`),
        z.array(reviewCommentSchema),
      ),
      getAllPages(
        this.request(access, `/repos/${project}/issues/${changeNumber}/comments?per_page=100`),
        z.array(issueCommentSchema),
      ),
    ]);
    const general = issueComments.map((comment): iRemoteDiscussion => ({
      id: `issue-${comment.id}`,
      isResolved: false,
      webUrl: comment.html_url,
      notes: [
        {
          id: String(comment.id),
          authorName: comment.user.name ?? comment.user.login,
          body: comment.body ?? '',
          createdAt: new Date(comment.created_at),
        },
      ],
    }));
    return [...threadReviewComments(reviewComments), ...general];
  }

  public async cloneUrl(access: iCodeHostAccess, project: string) {
    const found = await getJson(this.request(access, `/repos/${project}`), z.object({ clone_url: z.string() }));
    return found?.clone_url ?? `${access.baseUrl}/${project}.git`;
  }

  public changeRef(changeNumber: number) {
    return `refs/pull/${changeNumber}/head`;
  }

  public gitAuthorization(token: string) {
    return `Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`;
  }

  /** A pull request has no diff versions; a review can be pinned to any commit the pull request contains. */
  public async diffRefs(access: iCodeHostAccess, project: string, changeNumber: number, headSha: string) {
    const commits = await this.listChangeCommits(access, project, changeNumber);
    return commits.includes(headSha) ? { baseSha: '', startSha: '', headSha } : undefined;
  }

  /**
   * One pending review holding a comment per finding on a diff line; findings without one go in the review's
   * body. Leaving out `event` keeps the review pending until the reviewer submits it on GitHub.
   */
  public draftWrites(project: string, changeNumber: number, draft: iReviewDraft): iHostWrite[] {
    const { refs } = draft;
    const positioned = refs ? draft.comments.filter((comment) => comment.line !== undefined && comment.path) : [];
    const general = draft.comments.filter((comment) => !positioned.includes(comment));
    const body: Record<string, unknown> = {};
    if (refs) body.commit_id = refs.headSha;
    if (general.length > 0) body.body = general.map((comment) => comment.body).join(COMMENT_SEPARATOR);
    body.comments = positioned.map((comment) => ({
      path: comment.path,
      line: comment.line,
      side: comment.side === DIFF_SIDES.NEW ? 'RIGHT' : 'LEFT',
      body: comment.body,
    }));
    return [
      {
        path: `repos/${project}/pulls/${changeNumber}/reviews`,
        body,
        findingIds: draft.comments.map((comment) => comment.findingId),
      },
    ];
  }

  public async postWrite(access: iCodeHostAccess, write: iHostWrite) {
    const result = await postJson(
      { url: `${this.apiUrl(access.baseUrl)}/${write.path}`, headers: this.headers(access) },
      write.body,
      z.object({ id: z.number(), html_url: z.string().optional() }),
    );
    if (!result.isOk) {
      if (result.status === 422 && PENDING_REVIEW_ERROR.test(result.message)) {
        throw ORPCUnprocessableContentError(errorCodes.REVIEW_ALREADY_PENDING);
      }
      throw ORPCUnprocessableContentError(errorCodes.CODE_HOST_ERROR, { status: result.status });
    }
    return { remoteId: String(result.data.id), url: result.data.html_url };
  }

  /** github.com has its own API host; GitHub Enterprise Server serves the API under /api/v3. */
  public apiUrl(baseUrl: string) {
    return baseUrl === GITHUB_WEB_URL ? GITHUB_API_URL : `${baseUrl}/api/v3`;
  }

  private headers(access: iCodeHostAccess) {
    return {
      Authorization: `Bearer ${access.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private request(access: iCodeHostAccess, pathname: string) {
    return { url: `${this.apiUrl(access.baseUrl)}${pathname}`, headers: this.headers(access) };
  }
}
