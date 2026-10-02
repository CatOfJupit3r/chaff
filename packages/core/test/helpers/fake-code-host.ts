import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { TestGitRepo } from './git-repo';

export const GOOD_TOKEN = 'good-token';
export const REVIEWER = 'roman';

export interface iFakeChange {
  number: number;
  title: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  assignees?: string[];
  reviewers?: string[];
}

export interface iFakeComment {
  id: number;
  author: string;
  body: string;
  path?: string;
  line?: number;
  replyTo?: number;
}

const user = (username: string) => ({ username, name: username, login: username });

export interface iFakePost {
  path: string;
  body: Record<string, unknown>;
}

/**
 * A GitLab (`/api/v4`) and GitHub (`/api/v3`) API on localhost backed by a real repository: change
 * heads live under `refs/merge-requests/<n>/head` and `refs/pull/<n>/head`, as on the real hosts.
 */
export class FakeCodeHost {
  public readonly changes: iFakeChange[] = [];
  public readonly comments = new Map<number, iFakeComment[]>();
  public readonly requests: string[] = [];
  /** Bodies of every write, in order. */
  public readonly posts: iFakePost[] = [];
  /** Writes are refused, as with a read-only token. */
  public isReadOnly = false;
  /** GitHub answers that the reviewer already has a pending review. */
  public hasPendingReview = false;
  private server: Server | undefined;

  constructor(public readonly repo: TestGitRepo) {}

  public get baseUrl() {
    const address = this.server?.address() as AddressInfo | null;
    return `http://127.0.0.1:${address?.port ?? 0}`;
  }

  public async start(port = 0) {
    this.server = createServer((request, response) => this.handle(request, response));
    await new Promise((resolve: (value?: undefined) => unknown) =>
      this.server?.listen(port, '127.0.0.1', () => resolve()),
    );
  }

  public async stop() {
    await new Promise((resolve) => this.server?.close(resolve));
  }

  /** Adds a change whose head is the source branch's current tip. */
  public open(change: iFakeChange) {
    this.changes.push(change);
    this.syncHead(change.number);
  }

  /** Points the change's head refs at its source branch again, as the hosts do after a push. */
  public syncHead(changeNumber: number) {
    const change = this.changes.find((candidate) => candidate.number === changeNumber);
    if (!change) return;
    const sha = this.repo.git('rev-parse', `refs/heads/${change.sourceBranch}`);
    this.repo.git('update-ref', `refs/merge-requests/${changeNumber}/head`, sha);
    this.repo.git('update-ref', `refs/pull/${changeNumber}/head`, sha);
  }

  private head(changeNumber: number) {
    return this.repo.git('rev-parse', `refs/merge-requests/${changeNumber}/head`);
  }

  private branchSha(branch: string) {
    try {
      return this.repo.git('rev-parse', '--verify', '--quiet', `refs/heads/${branch}`);
    } catch {
      return undefined;
    }
  }

  private commits(change: iFakeChange) {
    return this.repo
      .git('rev-list', `${change.targetBranch}..${this.head(change.number)}`)
      .split('\n')
      .filter(Boolean);
  }

  private gitlabChange(change: iFakeChange) {
    return {
      iid: change.number,
      title: change.title,
      description: `Description of ${change.title}`,
      author: user(change.author),
      source_branch: change.sourceBranch,
      target_branch: change.targetBranch,
      sha: this.head(change.number),
      web_url: `${this.baseUrl}/group/project/-/merge_requests/${change.number}`,
      draft: false,
      updated_at: '2026-10-01T10:00:00Z',
      assignees: (change.assignees ?? []).map(user),
      reviewers: (change.reviewers ?? []).map(user),
    };
  }

  private githubChange(change: iFakeChange) {
    return {
      number: change.number,
      title: change.title,
      body: `Description of ${change.title}`,
      user: user(change.author),
      head: { ref: change.sourceBranch, sha: this.head(change.number) },
      base: { ref: change.targetBranch },
      html_url: `${this.baseUrl}/owner/repo/pull/${change.number}`,
      draft: false,
      updated_at: '2026-10-01T10:00:00Z',
      assignees: (change.assignees ?? []).map(user),
      requested_reviewers: (change.reviewers ?? []).map(user),
    };
  }

  private route(pathname: string): unknown {
    const find = (raw: string | undefined) => this.changes.find((change) => change.number === Number(raw));
    const routes: [RegExp, (match: RegExpExecArray) => unknown][] = [
      [/^\/api\/v[34]\/user$/, () => user(REVIEWER)],
      [/^\/api\/v4\/projects\/[^/]+$/, () => ({ http_url_to_repo: this.repo.path })],
      [/^\/api\/v4\/projects\/[^/]+\/merge_requests$/, () => this.changes.map((change) => this.gitlabChange(change))],
      [
        /^\/api\/v4\/projects\/[^/]+\/merge_requests\/(\d+)$/,
        (match) => this.mapFound(find(match[1]), (change) => this.gitlabChange(change)),
      ],
      [
        /^\/api\/v4\/projects\/[^/]+\/merge_requests\/(\d+)\/commits$/,
        (match) => this.mapFound(find(match[1]), (change) => this.commits(change).map((id) => ({ id }))),
      ],
      [
        /^\/api\/v4\/projects\/[^/]+\/repository\/branches\/(.+)$/,
        (match) => this.mapFound(this.branchSha(decodeURIComponent(match[1] ?? '')), (id) => ({ commit: { id } })),
      ],
      [
        /^\/api\/v4\/projects\/[^/]+\/merge_requests\/(\d+)\/versions$/,
        (match) => this.mapFound(find(match[1]), (change) => [this.gitlabVersion(change)]),
      ],
      [
        /^\/api\/v4\/projects\/[^/]+\/merge_requests\/(\d+)\/discussions$/,
        (match) => this.gitlabDiscussions(Number(match[1])),
      ],
      [/^\/api\/v3\/repos\/[^/]+\/[^/]+$/, () => ({ clone_url: this.repo.path })],
      [/^\/api\/v3\/repos\/[^/]+\/[^/]+\/pulls$/, () => this.changes.map((change) => this.githubChange(change))],
      [
        /^\/api\/v3\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)$/,
        (match) => this.mapFound(find(match[1]), (change) => this.githubChange(change)),
      ],
      [
        /^\/api\/v3\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)\/commits$/,
        (match) =>
          this.mapFound(find(match[1]), (change) =>
            this.commits(change)
              .toReversed()
              .map((sha) => ({ sha })),
          ),
      ],
      [
        /^\/api\/v3\/repos\/[^/]+\/[^/]+\/branches\/(.+)$/,
        (match) => this.mapFound(this.branchSha(decodeURIComponent(match[1] ?? '')), (sha) => ({ commit: { sha } })),
      ],
      [
        /^\/api\/v3\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)\/comments$/,
        (match) => this.githubReviewComments(Number(match[1])),
      ],
      [
        /^\/api\/v3\/repos\/[^/]+\/[^/]+\/issues\/(\d+)\/comments$/,
        (match) => this.githubIssueComments(Number(match[1])),
      ],
    ];
    for (const [pattern, respond] of routes) {
      const match = pattern.exec(pathname);
      if (match) return respond(match);
    }
    return undefined;
  }

  private mapFound<T>(value: T | undefined, map: (value: T) => unknown) {
    return value === undefined ? undefined : map(value);
  }

  private gitlabVersion(change: iFakeChange) {
    const head = this.head(change.number);
    const start = this.repo.git('rev-parse', `refs/heads/${change.targetBranch}`);
    return {
      id: Number.parseInt(head.slice(0, 6), 16),
      head_commit_sha: head,
      start_commit_sha: start,
      base_commit_sha: this.repo.git('merge-base', start, head),
    };
  }

  /** Draft notes on GitLab and pending reviews on GitHub; anything else is not a write the hosts take. */
  private write(pathname: string, body: Record<string, unknown>): [number, unknown] {
    if (this.isReadOnly) return [403, { message: '403 Forbidden - insufficient_scope' }];
    const isDraftNote = /^\/api\/v4\/projects\/[^/]+\/merge_requests\/\d+\/draft_notes$/.test(pathname);
    const review = /^\/api\/v3\/repos\/[^/]+\/[^/]+\/pulls\/(\d+)\/reviews$/.exec(pathname);
    if (!isDraftNote && !review) return [404, { message: '404 Not Found' }];
    if (review && this.hasPendingReview) {
      return [
        422,
        { message: 'Unprocessable Entity', errors: ['User can only have one pending review per pull request'] },
      ];
    }
    this.posts.push({ path: pathname, body });
    const id = this.posts.length;
    return review
      ? [
          200,
          { id, state: 'PENDING', html_url: `${this.baseUrl}/owner/repo/pull/${review[1]}#pullrequestreview-${id}` },
        ]
      : [201, { id, note: body.note }];
  }

  private gitlabDiscussions(changeNumber: number) {
    const comments = this.comments.get(changeNumber) ?? [];
    return comments
      .filter((comment) => comment.replyTo === undefined)
      .map((root) => ({
        id: `discussion-${root.id}`,
        notes: [root, ...comments.filter((comment) => comment.replyTo === root.id)].map((comment) => ({
          id: comment.id,
          body: comment.body,
          author: user(comment.author),
          created_at: '2026-10-01T11:00:00Z',
          system: false,
          resolvable: root.path !== undefined,
          resolved: false,
          position: root.path ? { new_path: root.path, new_line: root.line, head_sha: this.head(changeNumber) } : null,
        })),
      }));
  }

  private githubReviewComments(changeNumber: number) {
    const comments = this.comments.get(changeNumber) ?? [];
    const pathOf = (comment: iFakeComment) =>
      comment.path ?? comments.find((candidate) => candidate.id === comment.replyTo)?.path;
    return comments
      .filter((comment) => pathOf(comment) !== undefined)
      .map((comment) => ({
        id: comment.id,
        in_reply_to_id: comment.replyTo ?? null,
        path: pathOf(comment),
        line: comment.line ?? null,
        side: 'RIGHT',
        commit_id: this.head(changeNumber),
        body: comment.body,
        user: user(comment.author),
        created_at: '2026-10-01T11:00:00Z',
        html_url: `${this.baseUrl}/owner/repo/pull/${changeNumber}#discussion_r${comment.id}`,
      }));
  }

  private githubIssueComments(changeNumber: number) {
    return (this.comments.get(changeNumber) ?? [])
      .filter((comment) => comment.path === undefined && comment.replyTo === undefined)
      .map((comment) => ({
        id: comment.id,
        body: comment.body,
        user: user(comment.author),
        created_at: '2026-10-01T11:00:00Z',
        html_url: `${this.baseUrl}/owner/repo/pull/${changeNumber}#issuecomment-${comment.id}`,
      }));
  }

  private handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? '/', this.baseUrl);
    this.requests.push(url.pathname);
    if (request.headers.authorization !== `Bearer ${GOOD_TOKEN}`) {
      response.writeHead(401).end('{"message":"401 Unauthorized"}');
      return;
    }
    if (request.method === 'POST') {
      let raw = '';
      request.on('data', (chunk: Buffer) => {
        raw += chunk.toString('utf8');
      });
      request.on('end', () => {
        const [status, answer] = this.write(url.pathname, JSON.parse(raw || '{}') as Record<string, unknown>);
        response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(answer));
      });
      return;
    }
    const body = this.route(url.pathname);
    if (body === undefined) {
      response.writeHead(404).end('{"message":"404 Not Found"}');
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  }
}
