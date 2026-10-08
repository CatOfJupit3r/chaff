import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  AGENT_CHECKOUT_SUFFIX,
  DEMO_AUTHOR,
  DEMO_BRANCH,
  DEMO_MAIN_FILES,
  DEMO_STACK_COMMITS,
  DEMO_WORKING_CHANGE,
} from './demo-repository.constants.ts';
import type { DemoBranch, iDemoCommit } from './demo-repository.constants.ts';

/** A throwaway git repository with a three-branch stack for the recordings to review. */
export class DemoRepository {
  public constructor(public readonly directory: string) {}

  public create() {
    mkdirSync(this.directory, { recursive: true });
    this.git('init', '--initial-branch', DEMO_BRANCH.MAIN);
    this.writeFiles(DEMO_MAIN_FILES);
    this.git('add', '--all');
    this.git('commit', '--message', 'chore: webhook delivery');
    for (const commit of DEMO_STACK_COMMITS) {
      this.git('checkout', '--quiet', '-b', commit.branch);
      this.commit(commit);
    }
  }

  /** Commits on top of a branch the way an agent would: in a checkout of its own, leaving this one as it is. */
  public push(commit: iDemoCommit) {
    const agentCheckout = `${this.directory}${AGENT_CHECKOUT_SUFFIX}`;
    this.git('worktree', 'add', '--quiet', agentCheckout, commit.branch);
    try {
      this.commit(commit, agentCheckout);
    } finally {
      this.git('worktree', 'remove', '--force', agentCheckout);
    }
  }

  /** Leaves an uncommitted edit on whatever branch is checked out. */
  public leaveWorkingChange() {
    this.writeFiles({ [DEMO_WORKING_CHANGE.path]: DEMO_WORKING_CHANGE.content });
  }

  /** Deletes a branch the way a user cleaning up would, discarding any uncommitted work first. */
  public deleteBranch(branch: DemoBranch) {
    this.git('checkout', '--quiet', '--force', DEMO_BRANCH.MAIN);
    this.git('branch', '--quiet', '-D', branch);
  }

  private commit({ message, files }: iDemoCommit, checkout = this.directory) {
    this.writeFiles(files, checkout);
    this.gitIn(checkout, 'add', '--all');
    this.gitIn(checkout, 'commit', '--message', message);
  }

  private writeFiles(files: Record<string, string>, checkout = this.directory) {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(checkout, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  }

  private git(...args: string[]) {
    this.gitIn(this.directory, ...args);
  }

  private gitIn(cwd: string, ...args: string[]) {
    execFileSync('git', args, {
      cwd,
      stdio: 'ignore',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: DEMO_AUTHOR.name,
        GIT_AUTHOR_EMAIL: DEMO_AUTHOR.email,
        GIT_COMMITTER_NAME: DEMO_AUTHOR.name,
        GIT_COMMITTER_EMAIL: DEMO_AUTHOR.email,
      },
    });
  }
}
