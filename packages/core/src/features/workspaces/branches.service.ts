import { singleton } from 'tsyringe';

import { BranchRefsService } from '@~/features/git/branch-refs.service';
import type { iBranchRefRow } from '@~/features/git/branch-refs.service';
import { GitService } from '@~/features/git/git.service';
import { mapWithConcurrency } from '@~/lib/concurrency';

import type { iBranchLink, iBranchLinkStatus, iGitBranch, iNearbyBranch } from './workspaces.types';

const BRANCH_FIELDS = [
  '%(objectname)',
  '%(upstream:short)',
  '%(committerdate:unix)',
  '%(authorname)',
  '%(contents:subject)',
];
/** How far back a branch's history is searched for other branches' tips. */
const HISTORY_SEARCH_DEPTH = 2000;
/** Branch tips found nearest in the history that are counted as candidates. */
const MAX_HISTORY_CANDIDATES = 8;
const GIT_CONCURRENCY = 8;

interface iRawBranch {
  name: string;
  /** Full ref name: `refs/heads/<name>`, or `refs/remotes/<remote>/<name>` for a remote-only branch. */
  ref: string;
  remote?: string;
  headSha: string;
  upstream?: string;
  committedAt: Date;
  authorName: string;
  subject: string;
}

interface iListBranchesOptions {
  /** Branches listed whenever they exist, such as the branches of stacks. */
  keptNames?: ReadonlySet<string>;
  /** Emails, besides the repository's git user, whose commits count as the user's own. */
  authorEmails?: readonly string[];
}

interface iNearbyOptions {
  defaultBranch: string | undefined;
  /** Most branches returned. */
  limit: number;
}

function toRawBranch({ name, ref, remote, fields }: iBranchRefRow): iRawBranch {
  const [headSha = '', upstream = '', committedAt = '0', authorName = '', subject = ''] = fields;
  return {
    name,
    ref,
    remote,
    headSha,
    upstream: upstream || undefined,
    committedAt: new Date(Number(committedAt) * 1000),
    authorName,
    subject,
  };
}

/** Nearest first; at the same distance the default branch, then local branches, then alphabetical order. */
function byDistance(defaultBranch: string | undefined) {
  return (left: iNearbyBranch, right: iNearbyBranch) =>
    left.commitsApart - right.commitsApart ||
    Number(right.name === defaultBranch) - Number(left.name === defaultBranch) ||
    Number(left.remote !== undefined) - Number(right.remote !== undefined) ||
    left.name.localeCompare(right.name);
}

/**
 * Reads branches straight from the user's repository. Local branches are all listed; a remote-tracking branch
 * with no local branch of its name is listed while the default branch hasn't merged it, or when it is kept.
 * Nothing is guessed about how branches stack: the nearest branches below or above one branch are read only
 * when asked for.
 */
@singleton()
export class BranchesService {
  constructor(
    private readonly gitService: GitService,
    private readonly branchRefsService: BranchRefsService,
  ) {}

  public async listBranches(
    repoPath: string,
    defaultBranch: string | undefined,
    { keptNames = new Set(), authorEmails = [] }: iListBranchesOptions = {},
  ): Promise<iGitBranch[]> {
    const all = await this.readBranches(repoPath);
    const integrationRefs = await this.integrationRefs(
      repoPath,
      all.find((branch) => branch.name === defaultBranch),
    );
    const [mergedTips, authorPatterns] = await Promise.all([
      this.mergedTips(repoPath, integrationRefs),
      this.authorPatterns(repoPath, authorEmails),
    ]);
    const branches = all.filter(
      (branch) =>
        branch.remote === undefined ||
        branch.name === defaultBranch ||
        keptNames.has(branch.name) ||
        !mergedTips.has(branch.headSha),
    );
    const authored = await mapWithConcurrency(branches, GIT_CONCURRENCY, async (branch) => {
      const isRead = branch.remote === undefined || keptNames.has(branch.name);
      if (!isRead || branch.name === defaultBranch || mergedTips.has(branch.headSha)) return false;
      return this.hasUserCommits(repoPath, branch, authorPatterns, integrationRefs);
    });

    return branches
      .map(({ ref: _ref, ...branch }, index) => ({
        ...branch,
        isDefault: branch.name === defaultBranch,
        isAuthoredByUser: authored[index] ?? false,
      }))
      .sort(
        (left, right) =>
          Number(right.isDefault) - Number(left.isDefault) || right.committedAt.getTime() - left.committedAt.getTime(),
      );
  }

  /**
   * Branches whose tip is in the branch's history, nearest first, with the commits the branch has beyond each, and
   * the default branch last. Branches the default branch already merged are left out.
   */
  public async branchesBelow(repoPath: string, name: string, { defaultBranch, limit }: iNearbyOptions) {
    const all = await this.readBranches(repoPath);
    const branch = all.find((candidate) => candidate.name === name);
    if (!branch) return [];
    const defaultRow = all.find((candidate) => candidate.name === defaultBranch);
    const [history, mergedTips] = await Promise.all([
      this.gitService.output(repoPath, [
        'rev-list',
        '--topo-order',
        `--max-count=${HISTORY_SEARCH_DEPTH}`,
        branch.headSha,
      ]),
      this.mergedTips(repoPath, await this.integrationRefs(repoPath, defaultRow)),
    ]);
    const shas = history.split('\n').filter((sha) => sha.length > 0);
    const historyIndex = new Map(shas.map((sha, index) => [sha, index]));
    const candidates = all
      .filter(
        (candidate) =>
          candidate.name !== name &&
          candidate.name !== defaultBranch &&
          historyIndex.has(candidate.headSha) &&
          !mergedTips.has(candidate.headSha),
      )
      .sort((left, right) => (historyIndex.get(left.headSha) ?? 0) - (historyIndex.get(right.headSha) ?? 0))
      .slice(0, MAX_HISTORY_CANDIDATES);
    const nearby = await mapWithConcurrency(candidates, GIT_CONCURRENCY, async (candidate) =>
      this.toNearby(candidate, await this.countCommits(repoPath, candidate.headSha, branch.headSha)),
    );
    const nearest = nearby.sort(byDistance(defaultBranch)).slice(0, limit);
    if (!defaultRow) return nearest;
    return [...nearest, this.toNearby(defaultRow, await this.countCommits(repoPath, defaultRow.ref, branch.headSha))];
  }

  /** Branches that contain the branch's tip, nearest first, with the commits each has beyond it; never the default branch. */
  public async branchesAbove(repoPath: string, name: string, { defaultBranch, limit }: iNearbyOptions) {
    const all = await this.readBranches(repoPath);
    const branch = all.find((candidate) => candidate.name === name);
    if (!branch) return [];
    const containing = new Set(
      (
        await this.gitService.output(repoPath, [
          'for-each-ref',
          '--format=%(refname)',
          '--contains',
          branch.headSha,
          'refs/heads',
          'refs/remotes',
        ])
      ).split('\n'),
    );
    const candidates = all.filter(
      (candidate) => candidate.name !== name && candidate.name !== defaultBranch && containing.has(candidate.ref),
    );
    const nearby = await mapWithConcurrency(candidates, GIT_CONCURRENCY, async (candidate) =>
      this.toNearby(candidate, await this.countCommits(repoPath, branch.headSha, candidate.headSha)),
    );
    return nearby.sort(byDistance(defaultBranch)).slice(0, limit);
  }

  /**
   * How each branch sits on the branch it merges into: the commits it has beyond it, and whether that branch,
   * other than the default branch, moved on with commits the branch doesn't contain.
   */
  public async describeLinks(
    repoPath: string,
    links: readonly iBranchLink[],
    defaultBranch: string | undefined,
  ): Promise<iBranchLinkStatus[]> {
    const tips = new Map((await this.readBranches(repoPath)).map((branch) => [branch.name, branch.headSha]));
    return mapWithConcurrency(links, GIT_CONCURRENCY, async ({ branch, parent }) => {
      const sha = tips.get(branch);
      const parentSha = parent ? tips.get(parent) : undefined;
      if (!sha) return { branch, commitsAhead: 0, isParentMoved: false, isMissing: true };
      if (!parentSha) return { branch, commitsAhead: 0, isParentMoved: false, isMissing: false };
      const [commitsAhead, isContained] = await Promise.all([
        this.countCommits(repoPath, parentSha, sha),
        this.isAncestor(repoPath, parentSha, sha),
      ]);
      return { branch, commitsAhead, isParentMoved: parent !== defaultBranch && !isContained, isMissing: false };
    });
  }

  private async readBranches(repoPath: string) {
    return (await this.branchRefsService.list(repoPath, BRANCH_FIELDS)).map(toRawBranch);
  }

  private toNearby(branch: iRawBranch, commitsApart: number): iNearbyBranch {
    return { name: branch.name, remote: branch.remote, commitsApart };
  }

  /** The default branch and its upstream when that still exists: every finished branch is merged into one of them. */
  private async integrationRefs(repoPath: string, defaultRow: iRawBranch | undefined) {
    if (!defaultRow) return [];
    if (!defaultRow.upstream) return [defaultRow.ref];
    const { exitCode } = await this.gitService.run(
      repoPath,
      ['rev-parse', '--verify', '--quiet', `${defaultRow.upstream}^{commit}`],
      { allowFailure: true },
    );
    return exitCode === 0 ? [defaultRow.ref, defaultRow.upstream] : [defaultRow.ref];
  }

  /** Tips of every branch whose last commit is already in one of the integration refs. */
  private async mergedTips(repoPath: string, integrationRefs: readonly string[]) {
    if (integrationRefs.length === 0) return new Set<string>();
    const output = await this.gitService.output(repoPath, [
      'for-each-ref',
      '--format=%(objectname)',
      ...integrationRefs.map((ref) => `--merged=${ref}`),
      'refs/heads',
      'refs/remotes',
    ]);
    return new Set(output.split('\n').filter(Boolean));
  }

  /** The repository's configured author email and name, and the user's own emails, matched against commit authors. */
  private async authorPatterns(repoPath: string, authorEmails: readonly string[]) {
    const results = await Promise.all(
      ['user.email', 'user.name'].map(async (key) =>
        this.gitService.run(repoPath, ['config', '--get', key], { allowFailure: true }),
      ),
    );
    const configured = results.flatMap(({ stdout, exitCode }) =>
      exitCode === 0 && stdout.trim() ? [stdout.trim()] : [],
    );
    return [...new Set([...configured, ...authorEmails])];
  }

  /** Whether the user wrote any of the branch's commits that the integration refs don't have yet; case is ignored. */
  private async hasUserCommits(
    repoPath: string,
    branch: iRawBranch,
    authorPatterns: readonly string[],
    integrationRefs: readonly string[],
  ) {
    if (authorPatterns.length === 0) return false;
    const output = await this.gitService.output(repoPath, [
      'rev-list',
      '--max-count=1',
      '--fixed-strings',
      '--regexp-ignore-case',
      ...authorPatterns.map((pattern) => `--author=${pattern}`),
      branch.headSha,
      ...integrationRefs.map((ref) => `^${ref}`),
      '--',
    ]);
    return output.length > 0;
  }

  private async countCommits(repoPath: string, from: string, to: string) {
    const { stdout, exitCode } = await this.gitService.run(repoPath, ['rev-list', '--count', `${from}..${to}`], {
      allowFailure: true,
    });
    return exitCode === 0 ? Number(stdout.trim()) : 0;
  }

  private async isAncestor(repoPath: string, ancestor: string, sha: string) {
    const { exitCode } = await this.gitService.run(repoPath, ['merge-base', '--is-ancestor', ancestor, sha], {
      allowFailure: true,
    });
    return exitCode !== 1;
  }
}
