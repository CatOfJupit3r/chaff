import { singleton } from 'tsyringe';

import { GitService } from '@~/features/git/git.service';
import { mapWithConcurrency } from '@~/lib/concurrency';

import type { iGitBranch } from './workspaces.types';

const FIELD_SEPARATOR = '\u0000';
const BRANCH_FORMAT = [
  '%(refname:short)',
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
    .map((line) => {
      const [name = '', headSha = '', upstream = '', committedAt = '0', authorName = '', subject = ''] =
        line.split(FIELD_SEPARATOR);
      return {
        name,
        headSha,
        upstream: upstream || undefined,
        committedAt: new Date(Number(committedAt) * 1000),
        authorName,
        subject,
      };
    });
}

function upstreamMatches(branch: iRawBranch, candidate: string) {
  return branch.upstream === candidate || branch.upstream?.endsWith(`/${candidate}`) === true;
}

/** Reads local branches straight from the user's repository and suggests a parent for each. */
@singleton()
export class BranchesService {
  constructor(private readonly gitService: GitService) {}

  public async listBranches(repoPath: string, defaultBranch: string | undefined): Promise<iGitBranch[]> {
    const output = await this.gitService.output(repoPath, ['for-each-ref', `--format=${BRANCH_FORMAT}`, 'refs/heads']);
    const branches = parseBranches(output);

    const tips = new Map<string, string[]>();
    for (const branch of branches) {
      tips.set(branch.headSha, [...(tips.get(branch.headSha) ?? []), branch.name]);
    }

    const suggestions = await mapWithConcurrency(
      branches,
      GIT_CONCURRENCY,
      async (branch): Promise<iParentSuggestion> =>
        branch.name === defaultBranch ? { commitsAhead: 0 } : this.suggestParent(repoPath, branch, tips, defaultBranch),
    );

    return branches
      .map((branch, index) => ({
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
   * same commit from suggesting each other.
   */
  private async suggestParent(
    repoPath: string,
    branch: iRawBranch,
    tips: Map<string, string[]>,
    defaultBranch: string | undefined,
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
    if (ranked.length > 0) {
      const [parent] = ranked.sort(
        (left, right) =>
          left.commitsAhead - right.commitsAhead ||
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

  private async countCommits(repoPath: string, from: string, to: string) {
    return Number(await this.gitService.output(repoPath, ['rev-list', '--count', `${from}..${to}`]));
  }
}
