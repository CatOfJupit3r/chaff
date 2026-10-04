import { singleton } from 'tsyringe';

import { BranchRefsService } from '@~/features/git/branch-refs.service';
import type { iBranchRefRow } from '@~/features/git/branch-refs.service';
import { REMOTE_BRANCH_PREFIX } from '@~/features/git/branch-refs.utils';
import { GitService } from '@~/features/git/git.service';
import { mapWithConcurrency } from '@~/lib/concurrency';

import type { iGitBranch } from './workspaces.types';

const BRANCH_FIELDS = [
  '%(objectname)',
  '%(upstream:short)',
  '%(committerdate:unix)',
  '%(authorname)',
  '%(contents:subject)',
];
/** How far back the history is searched for other branches' tips. */
const PARENT_SEARCH_DEPTH = 2000;
/** Commits of the local stacks, beyond the default branch, searched for remote-only branches' tips. */
const STACK_SEARCH_DEPTH = 20000;
/** Branch tips found nearest in the history that are compared as possible parents. */
const MAX_PARENT_CANDIDATES = 8;
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

interface iParentSuggestion {
  parent?: string;
  commitsAhead: number;
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

interface iSuggestionContext {
  /** Branch names by the commit at their tip. */
  tips: ReadonlyMap<string, string[]>;
  /** Tips already merged into the default branch or its upstream; such branches have landed and parent nothing. */
  mergedTips: ReadonlySet<string>;
  /** Full ref name of each branch by its name. */
  refs: ReadonlyMap<string, string>;
  defaultBranch: string | undefined;
  knownParent: string | undefined;
}

function upstreamMatches(branch: iRawBranch, candidate: string) {
  return branch.upstream === candidate || branch.upstream?.endsWith(`/${candidate}`) === true;
}

function isRemoteRef(refs: ReadonlyMap<string, string>, name: string) {
  return refs.get(name)?.startsWith(REMOTE_BRANCH_PREFIX) === true;
}

/**
 * Reads branches straight from the user's repository and suggests a parent for each. Local branches are
 * all listed; a remote-tracking branch with no local branch of its name is listed when it belongs to a local
 * branch's stack.
 */
@singleton()
export class BranchesService {
  constructor(
    private readonly gitService: GitService,
    private readonly branchRefsService: BranchRefsService,
  ) {}

  /**
   * `knownParents` holds the parent suggested last time for each branch; `reviewedNames` are branches listed
   * whenever they exist, such as the ones under review and their parents.
   */
  public async listBranches(
    repoPath: string,
    defaultBranch: string | undefined,
    knownParents: ReadonlyMap<string, string> = new Map(),
    reviewedNames: ReadonlySet<string> = new Set(),
  ): Promise<iGitBranch[]> {
    const all = (await this.branchRefsService.list(repoPath, BRANCH_FIELDS)).map(toRawBranch);
    const branches = await this.stackMembers(repoPath, all, defaultBranch, reviewedNames);

    const tips = new Map<string, string[]>();
    for (const branch of branches) {
      tips.set(branch.headSha, [...(tips.get(branch.headSha) ?? []), branch.name]);
    }
    const refs = new Map(branches.map((branch) => [branch.name, branch.ref]));
    const integrationRefs = await this.integrationRefs(
      repoPath,
      branches.find((branch) => branch.name === defaultBranch),
    );
    const [mergedTips, authorPatterns] = await Promise.all([
      this.mergedTips(repoPath, integrationRefs),
      this.authorPatterns(repoPath),
    ]);

    const suggestions = await mapWithConcurrency(branches, GIT_CONCURRENCY, async (branch) => {
      if (branch.name === defaultBranch) return { commitsAhead: 0, isAuthoredByUser: false };
      const suggestion = await this.suggestParent(repoPath, branch, {
        tips,
        mergedTips,
        refs,
        defaultBranch,
        knownParent: knownParents.get(branch.name),
      });
      const isAuthoredByUser =
        suggestion.commitsAhead > 0 && (await this.hasUserCommits(repoPath, branch, authorPatterns, integrationRefs));
      return { ...suggestion, isAuthoredByUser };
    });

    return branches
      .map(({ ref: _ref, ...branch }, index) => ({
        ...branch,
        isDefault: branch.name === defaultBranch,
        suggestedParent: suggestions[index]?.parent,
        commitsAhead: suggestions[index]?.commitsAhead ?? 0,
        isAuthoredByUser: suggestions[index]?.isAuthoredByUser ?? false,
      }))
      .sort(
        (left, right) =>
          Number(right.isDefault) - Number(left.isDefault) || right.committedAt.getTime() - left.committedAt.getTime(),
      );
  }

  /**
   * Every local branch, plus the remote-only branches of the local stacks: those whose tip is in a local
   * branch's history but not on the default branch (the branches below it), and those that build on a local
   * branch or on one of those (the branches above it). Remote branches merged into the default branch, or
   * unrelated to any local branch, are left out, so a repository with many of them stays quick to read. The
   * default branch and the reviewed branches are kept even when they only exist on a remote.
   */
  private async stackMembers(
    repoPath: string,
    all: readonly iRawBranch[],
    defaultBranch: string | undefined,
    reviewedNames: ReadonlySet<string>,
  ) {
    const isKept = (branch: iRawBranch) =>
      branch.remote === undefined || branch.name === defaultBranch || reviewedNames.has(branch.name);
    const kept = all.filter(isKept);
    const locals = all.filter((branch) => branch.remote === undefined);
    const remoteOnly = all.filter((branch) => !isKept(branch));
    const defaultRef = all.find((branch) => branch.name === defaultBranch);
    const localTips = [
      ...new Set(locals.filter((branch) => branch.name !== defaultBranch).map((branch) => branch.headSha)),
    ];
    if (remoteOnly.length === 0 || localTips.length === 0) return kept;

    const history = await this.gitService.output(repoPath, [
      'rev-list',
      `--max-count=${STACK_SEARCH_DEPTH}`,
      ...localTips,
      ...(defaultRef ? [`^${defaultRef.ref}`] : []),
      '--',
    ]);
    const stackCommits = new Set(history.split('\n').filter(Boolean));
    const below = remoteOnly.filter((branch) => stackCommits.has(branch.headSha));
    const memberTips = [...new Set([...localTips, ...below.map((branch) => branch.headSha)])].filter((sha) =>
      stackCommits.has(sha),
    );
    const above =
      memberTips.length === 0
        ? new Set<string>()
        : new Set(
            (
              await this.gitService.output(repoPath, [
                'for-each-ref',
                '--format=%(refname)',
                ...memberTips.flatMap((sha) => ['--contains', sha]),
                'refs/remotes',
              ])
            ).split('\n'),
          );
    return [...kept, ...remoteOnly.filter((branch) => stackCommits.has(branch.headSha) || above.has(branch.ref))];
  }

  /**
   * Walks the branch's history (merged-in commits included) for other branches' tips and suggests the
   * one with the fewest commits between it and this branch, so a branch that merged newer commits of
   * its parent, or of the default branch, still stacks on its parent. Ties go to the branch's upstream,
   * then the default branch, then local branches over remote-only ones, then alphabetical order. At the
   * branch's own tip, another branch only qualifies if it is the default branch or sorts before this one,
   * which keeps two branches on the same commit from suggesting each other. The parent suggested last time
   * wins ties, and stays the parent after it gets commits this branch doesn't have, as long as this branch
   * still holds commits of its own (beyond the default branch) and no other branch is nearer. Branches already
   * merged into the default branch are skipped, so long-merged branches never chain into one giant stack.
   */
  private async suggestParent(
    repoPath: string,
    branch: iRawBranch,
    { tips, mergedTips, refs, defaultBranch, knownParent }: iSuggestionContext,
  ): Promise<iParentSuggestion> {
    const history = await this.gitService.output(repoPath, [
      'rev-list',
      '--topo-order',
      `--max-count=${PARENT_SEARCH_DEPTH}`,
      branch.headSha,
    ]);
    const shas = history.split('\n').filter((sha) => sha.length > 0);

    const candidates = shas
      .flatMap((sha, index) =>
        (tips.get(sha) ?? [])
          .filter(
            (name) =>
              name !== branch.name &&
              (name === defaultBranch || !mergedTips.has(sha)) &&
              (index > 0 || name === defaultBranch || name < branch.name),
          )
          .map((name) => ({ name, sha })),
      )
      .slice(0, MAX_PARENT_CANDIDATES);

    const ranked: { name: string; commitsAhead: number }[] = [];
    for (const { name, sha } of candidates) {
      ranked.push({ name, commitsAhead: await this.countCommits(repoPath, sha, branch.headSha) });
    }
    const moved = knownParent && !candidates.some(({ name }) => name === knownParent);
    const movedParent = moved
      ? await this.movedParent(repoPath, branch, knownParent, { refs, defaultBranch })
      : undefined;
    if (movedParent) ranked.push(movedParent);
    if (ranked.length > 0) {
      const [parent] = ranked.sort(
        (left, right) =>
          left.commitsAhead - right.commitsAhead ||
          Number(right.name === knownParent) - Number(left.name === knownParent) ||
          Number(upstreamMatches(branch, right.name)) - Number(upstreamMatches(branch, left.name)) ||
          Number(right.name === defaultBranch) - Number(left.name === defaultBranch) ||
          Number(isRemoteRef(refs, left.name)) - Number(isRemoteRef(refs, right.name)) ||
          left.name.localeCompare(right.name),
      );
      if (parent) return { parent: parent.name, commitsAhead: parent.commitsAhead };
    }

    if (!defaultBranch) return { commitsAhead: shas.length };
    const { stdout, exitCode } = await this.gitService.run(
      repoPath,
      ['rev-list', '--count', `${refs.get(defaultBranch) ?? defaultBranch}..${branch.headSha}`],
      { allowFailure: true },
    );
    return { parent: defaultBranch, commitsAhead: exitCode === 0 ? Number(stdout.trim()) : shas.length };
  }

  /** The parent from last time, counted from where this branch left it, when the branch still builds on it. */
  private async movedParent(
    repoPath: string,
    branch: iRawBranch,
    parent: string,
    { refs, defaultBranch }: Pick<iSuggestionContext, 'refs' | 'defaultBranch'>,
  ): Promise<{ name: string; commitsAhead: number } | undefined> {
    const parentRef = refs.get(parent);
    if (parent === defaultBranch || !parentRef) return undefined;
    const forkPoint = await this.gitService.run(repoPath, ['merge-base', parentRef, branch.headSha], {
      allowFailure: true,
    });
    const forkSha = forkPoint.stdout.trim();
    if (forkPoint.exitCode !== 0 || !forkSha) return undefined;
    const defaultRef = defaultBranch ? refs.get(defaultBranch) : undefined;
    if (defaultRef) {
      const onDefault = await this.gitService.run(repoPath, ['merge-base', '--is-ancestor', forkSha, defaultRef], {
        allowFailure: true,
      });
      if (onDefault.exitCode === 0) return undefined;
    }
    return { name: parent, commitsAhead: await this.countCommits(repoPath, forkSha, branch.headSha) };
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

  /** The repository's configured author email and name, matched against commit authors. */
  private async authorPatterns(repoPath: string) {
    const results = await Promise.all(
      ['user.email', 'user.name'].map(async (key) =>
        this.gitService.run(repoPath, ['config', '--get', key], { allowFailure: true }),
      ),
    );
    return results.flatMap(({ stdout, exitCode }) => (exitCode === 0 && stdout.trim() ? [stdout.trim()] : []));
  }

  /** Whether the configured user wrote any of the branch's commits that the integration refs don't have yet. */
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
      ...authorPatterns.map((pattern) => `--author=${pattern}`),
      branch.headSha,
      ...integrationRefs.map((ref) => `^${ref}`),
      '--',
    ]);
    return output.length > 0;
  }

  private async countCommits(repoPath: string, from: string, to: string) {
    return Number(await this.gitService.output(repoPath, ['rev-list', '--count', `${from}..${to}`]));
  }
}
