import { singleton } from 'tsyringe';

import { branchNameOfRef, LOCAL_BRANCH_REFS, REMOTE_BRANCH_REFS } from './branch-refs.utils';
import { GitService } from './git.service';

/**
 * Turns the branch names Chaff stores into refs of the user's repository. A local branch wins; a name like
 * `origin/feature` is the remote-tracking branch, so branches that were never checked out can still be stacked
 * and reviewed.
 */
@singleton()
export class BranchRefsService {
  constructor(private readonly gitService: GitService) {}

  /** The full ref of a branch, or undefined when the repository has no such branch. */
  public async qualify(repoPath: string, branch: string) {
    for (const ref of [`${LOCAL_BRANCH_REFS}/${branch}`, `${REMOTE_BRANCH_REFS}/${branch}`]) {
      const { exitCode } = await this.gitService.run(repoPath, ['show-ref', '--verify', '--quiet', ref], {
        allowFailure: true,
      });
      if (exitCode === 0) return ref;
    }
    return undefined;
  }

  /** Names of every local and remote-tracking branch in the repository. */
  public async listNames(repoPath: string) {
    const output = await this.gitService.output(repoPath, [
      'for-each-ref',
      '--format=%(refname)',
      LOCAL_BRANCH_REFS,
      REMOTE_BRANCH_REFS,
    ]);
    return new Set(output.split('\n').flatMap((ref) => branchNameOfRef(ref) ?? []));
  }
}
