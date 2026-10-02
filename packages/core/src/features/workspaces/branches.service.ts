import { singleton } from 'tsyringe';

import {
  branchNameOfRef,
  LOCAL_BRANCH_REFS,
  localNameOfRemote,
  REMOTE_BRANCH_REFS,
} from '@~/features/git/branch-refs.utils';
import { GitService } from '@~/features/git/git.service';
import { mapWithConcurrency } from '@~/lib/concurrency';

import { REMOTE_BRANCH_LIMIT, REMOTE_BRANCH_MAX_AGE_MS } from './branches.constants';
import type { iGitBranch } from './workspaces.types';

const FIELD_SEPARATOR = '\u0000';
const BRANCH_FORMAT = [
  '%(refname)',
  '%(objectname)',
  '%(upstream:short)',
  '%(committerdate:unix)',
  '%(authorname)',
  '%(contents:subject)',
].join('%00');
/** How far back the history is searched for other branches' tips. */
const PARENT_SEARCH_DEPTH = 2000;
/** Branch tips found nearest in the history that are compared as possible parents. */
const MAX_PARENT_CANDIDATES = 8;
const GIT_CONCURRENCY = 8;

interface iRawBranch {
  name: string;
  /** Full ref in the user's repository, `refs/heads/...` or `refs/remotes/...`. */
  ref: string;
  isRemote: boolean;
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

function parseBranches(output: string): iRawBranch[] {
  return output
    .split('\n')
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const [ref = '', headSha = '', upstream = '', committedAt = '0', authorName = '', subject = ''] =
        line.split(FIELD_SEPARATOR);
      const name = branchNameOfRef(ref);
      if (!name) return [];
      return [
        {
          name,
          ref,
          isRemote: ref.startsWith(`${REMOTE_BRANCH_REFS}/`),
          headSha,
          upstream: upstream || undefined,
          committedAt: new Date(Number(committedAt) * 1000),
          authorName,
          subject,
        },
      ];
    });
}

/**
 * Local branches, plus remote-tracking branches nobody checked out: a stack pushed by someone else, or by an
 * agent, shows whole. Only recent remote branches count, newest first and up to a limit, so a repository
 * with thousands of old remote branches stays quick to list.
 */
function selectBranches(branches: readonly iRawBranch[], now: number) {
  const local = branches.filter((branch) => !branch.isRemote);
  const localNames = new Set(local.map((branch) => branch.name));
  const remote = branches
    .filter(
      (branch) =>
        branch.isRemote &&
        !localNames.has(localNameOfRemote(branch.name)) &&
        now - branch.committedAt.getTime() <= REMOTE_BRANCH_MAX_AGE_MS,
    )
    .sort((left, right) => right.committedAt.getTime() - left.committedAt.getTime())
    .slice(0, REMOTE_BRANCH_LIMIT);
  return [...local, ...remote];
}

interface iSuggestionContext {
  /** Branch names by the commit at their tip. */
  tips: ReadonlyMap<string, string[]>;
  /** Full refs of the listed branches, by name. */
  refs: ReadonlyMap<string, string>;
  defaultBranch: string | undefined;
  knownParent: string | undefined;
}

function upstreamMatches(branch: iRawBranch, candidate: string) {
  return branch.upstream === candidate || branch.upstream?.endsWith(`/${candidate}`) === true;
}

/** Reads local and remote-tracking branches straight from the user's repository and suggests a parent for each. */
@singleton()
export class BranchesService {
  constructor(private readonly gitService: GitService) {}

  /** `knownParents` holds the parent suggested last time for each branch. */
  public async listBranches(
    repoPath: string,
    defaultBranch: string | undefined,
    knownParents: ReadonlyMap<string, string> = new Map(),
  ): Promise<iGitBranch[]> {
    const output = await this.gitService.output(repoPath, [
      'for-each-ref',
      `--format=${BRANCH_FORMAT}`,
      LOCAL_BRANCH_REFS,
      REMOTE_BRANCH_REFS,
    ]);
    const branches = selectBranches(parseBranches(output), Date.now());
    const refs = new Map(branches.map((branch) => [branch.name, branch.ref]));

    const tips = new Map<string, string[]>();
    for (const branch of branches) {
      tips.set(branch.headSha, [...(tips.get(branch.headSha) ?? []), branch.name]);
    }

    const suggestions = await mapWithConcurrency(
      branches,
      GIT_CONCURRENCY,
      async (branch): Promise<iParentSuggestion> =>
        branch.name === defaultBranch
          ? { commitsAhead: 0 }
          : this.suggestParent(repoPath, branch, {
              tips,
              refs,
              defaultBranch,
              knownParent: knownParents.get(branch.name),
            }),
    );

    return branches
      .map(({ ref: _ref, ...branch }, index) => ({
        ...branch,
        isDefault: branch.name === defaultBranch,
        suggestedParent: suggestions[index]?.parent,
        commitsAhead: suggestions[index]?.commitsAhead ?? 0,
      }))
      .sort(
        (left, right) =>
          Number(right.isDefault) - Number(left.isDefault) || right.committedAt.getTime() - left.committedAt.getTime(),
      );
  }

  /**
   * Walks the branch's history (merged-in commits included) for other branches' tips and suggests the
   * one with the fewest commits between it and this branch, so a branch that merged newer commits of
   * its parent, or of the default branch, still stacks on its parent. Ties go to the branch's upstream,
   * then the default branch, then alphabetical order. At the branch's own tip, another branch only
   * qualifies if it is the default branch or sorts before this one, which keeps two branches on the
   * same commit from suggesting each other. The parent suggested last time wins ties, and stays the
   * parent after it gets commits this branch doesn't have, as long as this branch still holds commits of
   * its own (beyond the default branch) and no other branch is nearer.
   */
  private async suggestParent(
    repoPath: string,
    branch: iRawBranch,
    { tips, refs, defaultBranch, knownParent }: iSuggestionContext,
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
          .filter((name) => name !== branch.name && (index > 0 || name === defaultBranch || name < branch.name))
          .map((name) => ({ name, sha })),
      )
      .slice(0, MAX_PARENT_CANDIDATES);

    const ranked: { name: string; commitsAhead: number }[] = [];
    for (const { name, sha } of candidates) {
      ranked.push({ name, commitsAhead: await this.countCommits(repoPath, sha, branch.headSha) });
    }
    const moved = knownParent && !candidates.some(({ name }) => name === knownParent);
    const movedParent = moved ? await this.movedParent(repoPath, branch, knownParent, refs, defaultBranch) : undefined;
    if (movedParent) ranked.push(movedParent);
    if (ranked.length > 0) {
      const [parent] = ranked.sort(
        (left, right) =>
          left.commitsAhead - right.commitsAhead ||
          Number(right.name === knownParent) - Number(left.name === knownParent) ||
          Number(upstreamMatches(branch, right.name)) - Number(upstreamMatches(branch, left.name)) ||
          Number(right.name === defaultBranch) - Number(left.name === defaultBranch) ||
          left.name.localeCompare(right.name),
      );
      if (parent) return { parent: parent.name, commitsAhead: parent.commitsAhead };
    }

    if (!defaultBranch) return { commitsAhead: shas.length };
    const { stdout, exitCode } = await this.gitService.run(
      repoPath,
      ['rev-list', '--count', `${defaultBranch}..${branch.headSha}`],
      { allowFailure: true },
    );
    return { parent: defaultBranch, commitsAhead: exitCode === 0 ? Number(stdout.trim()) : shas.length };
  }

  /** The parent from last time, counted from where this branch left it, when the branch still builds on it. */
  private async movedParent(
    repoPath: string,
    branch: iRawBranch,
    parent: string,
    refs: ReadonlyMap<string, string>,
    defaultBranch: string | undefined,
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

  private async countCommits(repoPath: string, from: string, to: string) {
    return Number(await this.gitService.output(repoPath, ['rev-list', '--count', `${from}..${to}`]));
  }
}
