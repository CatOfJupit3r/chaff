import { singleton } from 'tsyringe';

import { orderRemotes, parseBranchRef, preferLocal, REMOTE_BRANCH_PREFIX } from './branch-refs.utils';
import type { iBranchRef } from './branch-refs.utils';
import { GitService } from './git.service';

const FIELD_SEPARATOR = '\u0000';
/** Leading fields of every branch listing: the full ref name and, for a symbolic ref, its target. */
const REF_FIELDS = ['%(refname)', '%(symref)'];
/** Last segment of `refs/remotes/<remote>/HEAD`, the ref naming a remote's default branch. */
const REMOTE_HEAD_SUFFIX = '/HEAD';

/** A listed branch with the extra `for-each-ref` fields that were asked for, in order. */
export interface iBranchRefRow extends iBranchRef {
  fields: string[];
}

/**
 * Finds the repository's branches among its local and remote-tracking refs. A local branch wins over a
 * remote-tracking branch of the same name, and `origin` wins over other remotes, with one exception: the
 * remote's default branch (where `refs/remotes/<remote>/HEAD` points) is always read from the remote, so a
 * long-unpulled local `main` never stands in for the `main` everyone builds on and merges into.
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
    const lines = output
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.split(FIELD_SEPARATOR));
    const rows = lines.flatMap(([ref = '', symref = '', ...rest]): iBranchRefRow[] => {
      const branch = symref ? undefined : parseBranchRef(ref, remotes);
      return branch ? [{ ...branch, fields: rest }] : [];
    });
    const remoteDefaults = this.remoteDefaults(lines, rows, remotes);
    const read = rows.map((row) => {
      const remoteDefault = row.remote === undefined ? remoteDefaults.get(row.name) : undefined;
      return remoteDefault ? { name: row.name, ref: remoteDefault.ref, fields: remoteDefault.fields } : row;
    });
    return preferLocal(read, remotes);
  }

  /** Remote-tracking rows of each remote's default branch by branch name; the first remote in order wins a name. */
  private remoteDefaults(lines: readonly string[][], rows: readonly iBranchRefRow[], remotes: readonly string[]) {
    const rowsByRef = new Map(rows.map((row) => [row.ref, row]));
    const targets = new Map<string, string>(
      lines.flatMap(([ref = '', symref = '']) =>
        symref && ref.endsWith(REMOTE_HEAD_SUFFIX) ? [[ref.slice(0, -REMOTE_HEAD_SUFFIX.length), symref]] : [],
      ),
    );
    const defaults = new Map<string, iBranchRefRow>();
    for (const remote of remotes) {
      const target = rowsByRef.get(targets.get(`${REMOTE_BRANCH_PREFIX}${remote}`) ?? '');
      if (target && !defaults.has(target.name)) defaults.set(target.name, target);
    }
    return defaults;
  }

  /** Names of every branch, local or remote-only. */
  public async names(repoPath: string) {
    return new Set((await this.list(repoPath)).map((branch) => branch.name));
  }

  /** The branch called `name` and its tip, read the way `list` reads it; undefined when there is no such branch. */
  public async resolve(repoPath: string, name: string): Promise<(iBranchRef & { sha: string }) | undefined> {
    const branch = (await this.list(repoPath, ['%(objectname)'])).find((candidate) => candidate.name === name);
    if (!branch) return undefined;
    const {
      fields: [sha = ''],
      ...ref
    } = branch;
    return sha ? { ...ref, sha } : undefined;
  }
}
