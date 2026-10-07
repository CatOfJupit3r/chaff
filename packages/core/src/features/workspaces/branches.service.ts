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
/** Commits of the stacks, beyond the default branch, searched for remote-only branches' tips. */
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

interface iListBranchesOptions {
  /** The parent suggested last time for each branch. */
  knownParents?: ReadonlyMap<string, string>;
  /** Branches listed whenever they exist, such as the ones under review and their parents. */
  reviewedNames?: ReadonlySet<string>;
  /** Lists every remote-only branch the default branch hasn't merged, not only those of the local stacks. */
  shouldIncludeRemoteBranches?: boolean;
  /** Emails, besides the repository's git user, whose commits count as the user's own. */
  authorEmails?: readonly string[];
  /** Target branch of each branch's open merge or pull request, which is that branch's parent. */
  changeParents?: ReadonlyMap<string, string>;
}

interface iStackMemberOptions extends Pick<iListBranchesOptions, 'shouldIncludeRemoteBranches'> {
  defaultBranch: string | undefined;
  reviewedNames: ReadonlySet<string>;
  changeParents: ReadonlyMap<string, string>;
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
 * Reads branches straight from the user's repository and suggests a parent for each: the target branch of its
 * open merge or pull request when it has one, else the nearest branch below it in the history. Local branches
 * are all listed; a remote-tracking branch with no local branch of its name is listed when it belongs to a
 * local branch's stack or is a listed branch's change target, or, when remote branches are included, whenever
 * the default branch hasn't merged it.
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
    {
      knownParents = new Map(),
      reviewedNames = new Set(),
      shouldIncludeRemoteBranches,
      authorEmails = [],
      changeParents = new Map(),
    }: iListBranchesOptions = {},
  ): Promise<iGitBranch[]> {
    const all = (await this.branchRefsService.list(repoPath, BRANCH_FIELDS)).map(toRawBranch);
    const branches = await this.stackMembers(repoPath, all, {
      defaultBranch,
      reviewedNames,
      shouldIncludeRemoteBranches,
      changeParents,
    });

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
      this.authorPatterns(repoPath, authorEmails),
    ]);

    const suggestions = await mapWithConcurrency(branches, GIT_CONCURRENCY, async (branch) => {
      if (branch.name === defaultBranch) return { commitsAhead: 0, isAuthoredByUser: false };
      const context = { tips, mergedTips, refs, defaultBranch, knownParent: knownParents.get(branch.name) };
      const changeParent = changeParents.get(branch.name);
      const suggestion =
        changeParent === undefined
          ? await this.suggestParent(repoPath, branch, context)
          : await this.changeParentSuggestion(repoPath, branch, changeParent, context);
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
   * Every local branch, plus the remote-only branches of the stacks: those whose tip is in a stack branch's
   * history but not on the default branch (the branches below it), and those that build on a stack branch or
   * on one of those (the branches above it). Stacks start from the local branches, and also from every
   * remote-only branch when remote branches are included. Remote branches merged into the default branch, or
   * unrelated to any stack, are left out, so a repository with many of them stays quick to read. The default
   * branch, the reviewed branches and the members' change targets are kept even when they only exist on a remote.
   */
  private async stackMembers(
    repoPath: string,
    all: readonly iRawBranch[],
    { defaultBranch, reviewedNames, shouldIncludeRemoteBranches, changeParents }: iStackMemberOptions,
  ) {
    const isKept = (branch: iRawBranch) =>
      branch.remote === undefined || branch.name === defaultBranch || reviewedNames.has(branch.name);
    const kept = all.filter(isKept);
    const remoteOnly = all.filter((branch) => !isKept(branch));
    const defaultRef = all.find((branch) => branch.name === defaultBranch);
    const stackStarts = all.filter(
      (branch) => branch.name !== defaultBranch && (branch.remote === undefined || shouldIncludeRemoteBranches),
    );
    const startTips = [...new Set(stackStarts.map((branch) => branch.headSha))];
    if (remoteOnly.length === 0 || startTips.length === 0) return this.withChangeTargets(kept, all, changeParents);

    const history = await this.gitService.output(repoPath, [
      'rev-list',
      `--max-count=${STACK_SEARCH_DEPTH}`,
      ...startTips,
      ...(defaultRef ? [`^${defaultRef.ref}`] : []),
      '--',
    ]);
    const stackCommits = new Set(history.split('\n').filter(Boolean));
    const below = remoteOnly.filter((branch) => stackCommits.has(branch.headSha));
    const memberTips = [...new Set([...startTips, ...below.map((branch) => branch.headSha)])].filter((sha) =>
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
    return this.withChangeTargets(
      [...kept, ...remoteOnly.filter((branch) => stackCommits.has(branch.headSha) || above.has(branch.ref))],
      all,
      changeParents,
    );
  }

  /** The members, plus the target branch of each one's open change, and of theirs, when it is in the repository. */
  private withChangeTargets(
    members: readonly iRawBranch[],
    all: readonly iRawBranch[],
    changeParents: ReadonlyMap<string, string>,
  ) {
    const byName = new Map(all.map((branch) => [branch.name, branch]));
    const listed = new Map(members.map((branch) => [branch.name, branch]));
    let pending = [...listed.keys()];
    while (pending.length > 0) {
      const added = pending.flatMap((name) => {
        const target = byName.get(changeParents.get(name) ?? '');
        if (!target || listed.has(target.name)) return [];
        listed.set(target.name, target);
        return [target.name];
      });
      pending = added;
    }
    return [...listed.values()];
  }

  /**
   * A branch with an open change stacks on the change's target branch. Its commits are counted from that
   * branch, or, when the repository doesn't have it, the way the history suggests.
   */
  private async changeParentSuggestion(
    repoPath: string,
    branch: iRawBranch,
    parent: string,
    context: iSuggestionContext,
  ): Promise<iParentSuggestion> {
    const parentRef = context.refs.get(parent);
    if (parentRef) return { parent, commitsAhead: await this.countCommits(repoPath, parentRef, branch.headSha) };
    return { ...(await this.suggestParent(repoPath, branch, context)), parent };
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
    return Number(await this.gitService.output(repoPath, ['rev-list', '--count', `${from}..${to}`]));
  }
}
