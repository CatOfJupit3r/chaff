import { singleton } from 'tsyringe';

import {
  LOCAL_BRANCH_PREFIX,
  orderRemotes,
  parseBranchRef,
  preferLocal,
  REMOTE_BRANCH_PREFIX,
} from './branch-refs.utils';
import type { iBranchRef } from './branch-refs.utils';
import { GitService } from './git.service';

const FIELD_SEPARATOR = '\u0000';
/** Leading fields of every branch listing: the full ref name and, for a symbolic ref, its target. */
const REF_FIELDS = ['%(refname)', '%(symref)'];

/** A listed branch with the extra `for-each-ref` fields that were asked for, in order. */
export interface iBranchRefRow extends iBranchRef {
  fields: string[];
}

/**
 * Finds the repository's branches among its local and remote-tracking refs. A local branch wins over a
 * remote-tracking branch of the same name, and `origin` wins over other remotes.
 */
@singleton()
export class BranchRefsService {
  constructor(private readonly gitService: GitService) {}

  /** The repository's remotes, `origin` first. */
  public async remotes(repoPath: string) {
    const { stdout } = await this.gitService.run(repoPath, ['remote'], { allowFailure: true });
    return orderRemotes(stdout.split('\n').map((name) => name.trim()));
  }

  /** Every branch, local or remote-only, with the `for-each-ref` fields asked for (`%(objectname)`, ...). */
  public async list(repoPath: string, fields: readonly string[] = []): Promise<iBranchRefRow[]> {
    const [remotes, output] = await Promise.all([
      this.remotes(repoPath),
      this.gitService.output(repoPath, [
        'for-each-ref',
        `--format=${[...REF_FIELDS, ...fields].join('%00')}`,
        'refs/heads',
        'refs/remotes',
      ]),
    ]);
    const rows = output
      .split('\n')
      .filter((line) => line.length > 0)
      .flatMap((line): iBranchRefRow[] => {
        const [ref = '', symref = '', ...rest] = line.split(FIELD_SEPARATOR);
        const branch = symref ? undefined : parseBranchRef(ref, remotes);
        return branch ? [{ ...branch, fields: rest }] : [];
      });
    return preferLocal(rows, remotes);
  }

  /** Names of every branch, local or remote-only. */
  public async names(repoPath: string) {
    return new Set((await this.list(repoPath)).map((branch) => branch.name));
  }

  /** The branch called `name` and its tip: the local branch, else a remote-tracking one; undefined when neither exists. */
  public async resolve(repoPath: string, name: string): Promise<(iBranchRef & { sha: string }) | undefined> {
    const remotes = await this.remotes(repoPath);
    const candidates = [
      `${LOCAL_BRANCH_PREFIX}${name}`,
      ...remotes.map((remote) => `${REMOTE_BRANCH_PREFIX}${remote}/${name}`),
    ];
    const { stdout } = await this.gitService.run(
      repoPath,
      ['for-each-ref', `--format=${[...REF_FIELDS, '%(objectname)'].join('%00')}`, ...candidates],
      { allowFailure: true },
    );
    const found = new Map(
      stdout
        .split('\n')
        .map((line) => line.split(FIELD_SEPARATOR))
        .filter(([ref, symref]) => ref && !symref)
        .map(([ref = '', , sha = '']) => [ref, sha]),
    );
    for (const ref of candidates) {
      const sha = found.get(ref);
      const branch = sha ? parseBranchRef(ref, remotes) : undefined;
      if (sha && branch?.name === name) return { ...branch, sha };
    }
    return undefined;
  }
}
