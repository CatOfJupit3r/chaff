import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const createdDirectories: string[] = [];

/** Fixed clock so branch ordering by commit date is deterministic. */
let commitClock = Date.UTC(2026, 0, 1) / 1000;

export function createTempDirectory(prefix = 'chaff-test-') {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  createdDirectories.push(directory);
  return directory;
}

export function removeTempDirectories() {
  for (const directory of createdDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** A throwaway repository on disk, driven with the real git binary. */
export class TestGitRepo {
  public constructor(public readonly path: string) {}

  public git(...args: string[]) {
    commitClock += 60;
    const date = `${commitClock} +0000`;
    return execFileSync('git', args, {
      cwd: this.path,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test Author',
        GIT_AUTHOR_EMAIL: 'author@example.com',
        GIT_COMMITTER_NAME: 'Test Author',
        GIT_COMMITTER_EMAIL: 'author@example.com',
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
    }).trim();
  }

  /** Writes a file and commits it on the current branch; returns the new commit sha. */
  public commit(message: string, file = 'file.txt', content = `${message}\n`) {
    const filePath = path.join(this.path, file);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
    this.git('add', '--', file);
    this.git('commit', '--quiet', '-m', message);
    return this.git('rev-parse', 'HEAD');
  }

  /** Writes, replaces or (with null) deletes several files and commits them together; returns the commit sha. */
  public commitFiles(message: string, files: Record<string, string | Buffer | null>) {
    for (const [file, content] of Object.entries(files)) {
      const filePath = path.join(this.path, file);
      if (content === null) {
        rmSync(filePath, { force: true });
      } else {
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, content);
      }
    }
    this.git('add', '--all');
    this.git('commit', '--quiet', '-m', message);
    return this.git('rev-parse', 'HEAD');
  }

  public branch(name: string, startPoint = 'HEAD') {
    this.git('switch', '--quiet', '-c', name, startPoint);
  }

  public switch(name: string) {
    this.git('switch', '--quiet', name);
  }
}

/** Creates a repository with one commit on `initialBranch`. */
export function createTestGitRepo(initialBranch = 'main') {
  const repo = new TestGitRepo(createTempDirectory('chaff-repo-'));
  repo.git('init', '--quiet', '-b', initialBranch);
  repo.commit('initial commit', 'README.md');
  return repo;
}

/** Clones `source` into a new temp directory, so the clone has `origin/HEAD`. */
export function cloneTestGitRepo(source: TestGitRepo) {
  const target = createTempDirectory('chaff-clone-');
  execFileSync('git', ['clone', '--quiet', source.path, target]);
  return new TestGitRepo(target);
}
