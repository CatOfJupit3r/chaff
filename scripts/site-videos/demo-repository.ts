import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { DEMO_AUTHOR, DEMO_BRANCH, DEMO_MAIN_FILES, DEMO_STACK_COMMITS } from './demo-repository.constants.ts';
import type { iDemoCommit } from './demo-repository.constants.ts';

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

  /** Commits on top of a branch the way the agent would, leaving that branch checked out. */
  public push(commit: iDemoCommit) {
    this.git('checkout', '--quiet', commit.branch);
    this.commit(commit);
  }

  private commit({ message, files }: iDemoCommit) {
    this.writeFiles(files);
    this.git('add', '--all');
    this.git('commit', '--message', message);
  }

  private writeFiles(files: Record<string, string>) {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(this.directory, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  }

  private git(...args: string[]) {
    execFileSync('git', args, {
      cwd: this.directory,
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
