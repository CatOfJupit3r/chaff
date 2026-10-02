import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { DiffSide } from '@chaff/common/enums/review.enums';

import type { connections } from '@~/db/schema/connections.schema';

export type iConnectionRecord = typeof connections.$inferSelect;

export type iNewConnection = Pick<typeof connections.$inferInsert, 'host' | 'baseUrl' | 'username'>;

export type iConnectionResponse = Omit<iConnectionRecord, 'updatedAt'>;

/** What a provider needs to call a host's API on the reviewer's behalf. */
export interface iCodeHostAccess {
  baseUrl: string;
  token: string;
}

/** A merge request or pull request as the host reports it. */
export interface iRemoteChange {
  number: number;
  title: string;
  description: string;
  authorName: string;
  authorUsername: string;
  sourceBranch: string;
  targetBranch: string;
  headSha: string;
  webUrl: string;
  isDraft: boolean;
  updatedAt: Date;
  assigneeUsernames: string[];
  reviewerUsernames: string[];
}

export interface iRemoteNote {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
}

/** A thread on a change. Threads without a path are about the change as a whole. */
export interface iRemoteDiscussion {
  id: string;
  path?: string;
  newLine?: number;
  oldLine?: number;
  /** Commit the thread was written against; it may be newer than the snapshot. */
  commitSha?: string;
  isResolved: boolean;
  webUrl?: string;
  notes: iRemoteNote[];
}

/** The commits a change's diff is drawn between on the host, which a positioned comment must name. */
export interface iDiffRefs {
  baseSha: string;
  startSha: string;
  headSha: string;
}

/** A comment for one finding: on one line of the diff, or on the change as a whole when `line` is absent. */
export interface iDraftComment {
  findingId: string;
  body: string;
  path?: string;
  oldPath?: string;
  side: DiffSide;
  line?: number;
}

export interface iReviewDraft {
  refs?: iDiffRefs;
  comments: iDraftComment[];
}

/** One API call that posts part of a draft, kept as data so it can also be shown as a command. */
export interface iHostWrite {
  /** Relative to the host's API root, without a leading slash. */
  path: string;
  body: Record<string, unknown>;
  findingIds: string[];
}

/**
 * One host's API. Everything reads, except posting a review draft: GitLab draft notes and a pending GitHub
 * review, which stay invisible to others until the reviewer publishes or submits them on the host.
 */
export interface iCodeHostProvider {
  readonly host: CodeHost;
  currentUser: (access: iCodeHostAccess) => Promise<{ username: string }>;
  listChanges: (access: iCodeHostAccess, project: string) => Promise<iRemoteChange[]>;
  getChange: (access: iCodeHostAccess, project: string, changeNumber: number) => Promise<iRemoteChange | undefined>;
  /** Commit shas of the change, newest first. */
  listChangeCommits: (access: iCodeHostAccess, project: string, changeNumber: number) => Promise<string[]>;
  branchHead: (access: iCodeHostAccess, project: string, branch: string) => Promise<string | undefined>;
  listDiscussions: (access: iCodeHostAccess, project: string, changeNumber: number) => Promise<iRemoteDiscussion[]>;
  cloneUrl: (access: iCodeHostAccess, project: string) => Promise<string>;
  /** The ref the host keeps for a change's head, fetchable even when the source branch lives in a fork. */
  changeRef: (changeNumber: number) => string;
  /** Value of the `Authorization` header git sends when fetching over https. */
  gitAuthorization: (token: string) => string;
  /** The diff commits of the change's version whose head is `headSha`; undefined when the host has no such version. */
  diffRefs: (
    access: iCodeHostAccess,
    project: string,
    changeNumber: number,
    headSha: string,
  ) => Promise<iDiffRefs | undefined>;
  /** The API calls that post a draft. Nothing is published or submitted. */
  draftWrites: (project: string, changeNumber: number, draft: iReviewDraft) => iHostWrite[];
  /** Sends one write; returns the id and address of what the host created. */
  postWrite: (access: iCodeHostAccess, write: iHostWrite) => Promise<{ remoteId: string; url?: string }>;
  apiUrl: (baseUrl: string) => string;
}

/** The project a workspace's merge requests come from. */
export interface iWorkspaceRemote {
  connection: iConnectionRecord;
  project: string;
  isDetected: boolean;
}
