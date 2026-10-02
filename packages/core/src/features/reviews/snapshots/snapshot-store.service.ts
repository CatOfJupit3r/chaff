import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { errorCodes } from '@chaff/common/enums/errors.enums';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { GitService } from '@~/features/git/git.service';
import { KeyedMutex } from '@~/lib/concurrency';
import { pathExists } from '@~/lib/file-system';
import { ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import type { iSnapshotHeads, iSnapshotShas } from './snapshots.types';

const STORES_DIRECTORY = 'stores';
const FETCH_REF_PREFIX = 'refs/chaff/fetch';
const SNAPSHOT_REF_PREFIX = 'refs/chaff/snapshots';
const BLOB_BATCH_SIZE = 200;
const TEMPORARY_DIRECTORY = 'tmp';
/** Author and committer of the commits Chaff makes in its store for working changes. */
const CHAFF_AUTHOR_ENV = {
  GIT_AUTHOR_NAME: 'Chaff',
  GIT_AUTHOR_EMAIL: 'chaff@localhost',
  GIT_COMMITTER_NAME: 'Chaff',
  GIT_COMMITTER_EMAIL: 'chaff@localhost',
};

/** Matches kept per file by `grep`; enough to show how a symbol is used without reading whole files. */
const MAX_GREP_HITS_PER_FILE = 20;

/** Options that keep `git diff` output stable whatever the user's git configuration says. */
const DIFF_OPTIONS = ['--find-renames', '--no-ext-diff', '--no-textconv', '--no-relative', '--ignore-submodules=none'];

function pinnedRefs(snapshotId: string, shas: iSnapshotShas) {
  const prefix = `${SNAPSHOT_REF_PREFIX}/${snapshotId}`;
  return [
    [`${prefix}/head`, shas.headSha],
    [`${prefix}/parent`, shas.parentHeadSha],
    [`${prefix}/base`, shas.baseSha],
  ] as const;
}

/**
 * Chaff's own bare repository per workspace, inside the app data folder. Branches are fetched into it
 * from the user's repository, which is only read, and every snapshot's commits are pinned under
 * `refs/chaff/snapshots/<id>/` so they survive rebases, force-pushes and garbage collection.
 */
@singleton()
export class SnapshotStoreService {
  private readonly mutex = new KeyedMutex();

  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly gitService: GitService,
  ) {}

  public storePath(workspaceId: string) {
    return path.join(this.options.dataDir, STORES_DIRECTORY, `${workspaceId}.git`);
  }

  /** Current tip of a local branch in the user's repository, or undefined when there is no such branch. */
  public async resolveBranch(repoPath: string, branch: string) {
    const { stdout, exitCode } = await this.gitService.run(
      repoPath,
      ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}^{commit}`],
      { allowFailure: true },
    );
    return exitCode === 0 ? stdout.trim() : undefined;
  }

  /** Copies a branch and its parent into the store and returns the tips that were copied. */
  public async fetchHeads(
    workspace: { id: string; repoPath: string },
    branch: string,
    parentBranch: string,
  ): Promise<iSnapshotHeads> {
    for (const name of [branch, parentBranch]) {
      if (!(await this.resolveBranch(workspace.repoPath, name))) {
        throw ORPCNotFoundError(errorCodes.BRANCH_NOT_FOUND, { branch: name });
      }
    }

    return this.mutex.run(workspace.id, async () => {
      const storePath = await this.ensureStore(workspace);
      await this.gitService.run(storePath, [
        'fetch',
        '--quiet',
        '--no-tags',
        '--no-write-fetch-head',
        '--no-recurse-submodules',
        workspace.repoPath,
        `+refs/heads/${branch}:${FETCH_REF_PREFIX}/head`,
        `+refs/heads/${parentBranch}:${FETCH_REF_PREFIX}/parent`,
      ]);
      const output = await this.gitService.output(storePath, [
        'rev-parse',
        `${FETCH_REF_PREFIX}/head`,
        `${FETCH_REF_PREFIX}/parent`,
      ]);
      const [headSha = '', parentHeadSha = ''] = output.split('\n');
      return { headSha, parentHeadSha };
    });
  }

  /**
   * Copies a merge or pull request and its target branch from the code host into the store. The token
   * travels in an environment-configured header, so it never appears in a process list or a git config
   * file. The target branch is first copied from the local repository when it has it, so only the
   * missing objects come over the network.
   */
  public async fetchRemoteHeads(
    workspace: { id: string; repoPath: string },
    remote: { url: string; authorization: string; headRef: string; parentBranch: string },
  ): Promise<iSnapshotHeads> {
    return this.mutex.run(workspace.id, async () => {
      const storePath = await this.ensureStore(workspace);
      const fetchOptions = ['fetch', '--quiet', '--no-tags', '--no-write-fetch-head', '--no-recurse-submodules'];
      await this.gitService.run(
        storePath,
        [...fetchOptions, workspace.repoPath, `+refs/heads/${remote.parentBranch}:${FETCH_REF_PREFIX}/local`],
        { allowFailure: true },
      );
      await this.gitService.run(
        storePath,
        [
          ...fetchOptions,
          remote.url,
          `+${remote.headRef}:${FETCH_REF_PREFIX}/head`,
          `+refs/heads/${remote.parentBranch}:${FETCH_REF_PREFIX}/parent`,
        ],
        {
          env: {
            GIT_TERMINAL_PROMPT: '0',
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'http.extraHeader',
            GIT_CONFIG_VALUE_0: `Authorization: ${remote.authorization}`,
          },
        },
      );
      const output = await this.gitService.output(storePath, [
        'rev-parse',
        `${FETCH_REF_PREFIX}/head`,
        `${FETCH_REF_PREFIX}/parent`,
      ]);
      const [headSha = '', parentHeadSha = ''] = output.split('\n');
      return { headSha, parentHeadSha };
    });
  }

  /** Local branches checked out in one of the repository's worktrees, with the worktree's folder. */
  public async listWorktrees(repoPath: string) {
    const { stdout } = await this.gitService.run(repoPath, ['worktree', 'list', '--porcelain', '-z'], {
      allowFailure: true,
    });
    const worktrees = new Map<string, string>();
    let folder: string | undefined;
    for (const field of stdout.split('\0')) {
      if (field.startsWith('worktree ')) folder = field.slice('worktree '.length);
      else if (field.startsWith('branch refs/heads/') && folder)
        worktrees.set(field.slice('branch refs/heads/'.length), folder);
      else if (field === '') folder = undefined;
    }
    return worktrees;
  }

  /**
   * Summarizes the uncommitted state of a worktree: `git status` plus the size and modification time of
   * every changed file, so an edit to an already modified file still changes it. Undefined when clean.
   */
  public async workingFingerprint(worktreePath: string) {
    const { stdout } = await this.gitService.run(worktreePath, [
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
    ]);
    if (stdout.length === 0) return undefined;
    const paths = stdout
      .split('\0')
      .filter((entry) => entry.length > 3)
      .map((entry) => entry.slice(3));
    const hash = createHash('sha1').update(stdout);
    for (const filePath of paths) {
      const details = await stat(path.join(worktreePath, filePath)).catch(() => undefined);
      hash.update(`\0${filePath}:${details ? `${details.size}:${details.mtimeMs}` : 'gone'}`);
    }
    return hash.digest('hex');
  }

  /**
   * Copies the uncommitted work of a worktree into the store as a commit on top of the branch. The
   * work is read through a throwaway index with the store as the repository, so the user's index,
   * stash and objects are never written.
   */
  public async captureWorkingChanges(
    workspace: { id: string; repoPath: string },
    branch: string,
    worktreePath: string,
  ): Promise<iSnapshotHeads> {
    const { headSha: branchSha } = await this.fetchHeads(workspace, branch, branch);
    return this.mutex.run(workspace.id, async () => {
      const storePath = this.storePath(workspace.id);
      const temporaryRoot = path.join(this.options.dataDir, TEMPORARY_DIRECTORY);
      await mkdir(temporaryRoot, { recursive: true });
      const scratch = await mkdtemp(path.join(temporaryRoot, 'working-'));
      const env = { GIT_DIR: storePath, GIT_WORK_TREE: worktreePath, GIT_INDEX_FILE: path.join(scratch, 'index') };
      try {
        await this.gitService.run(worktreePath, ['read-tree', branchSha], { env });
        await this.gitService.run(worktreePath, ['add', '--all', '--', '.'], { env });
        const tree = await this.gitService.output(worktreePath, ['write-tree'], { env });
        const headSha = await this.gitService.output(
          storePath,
          ['commit-tree', tree, '-p', branchSha, '-m', `Working changes on ${branch}`],
          { env: CHAFF_AUTHOR_ENV },
        );
        return { headSha, parentHeadSha: branchSha };
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
    });
  }

  public async mergeBase(workspaceId: string, heads: iSnapshotHeads) {
    const { stdout, exitCode } = await this.gitService.run(
      this.storePath(workspaceId),
      ['merge-base', heads.headSha, heads.parentHeadSha],
      { allowFailure: true },
    );
    const baseSha = stdout.trim();
    if (exitCode !== 0 || baseSha.length === 0) throw ORPCUnprocessableContentError(errorCodes.NO_COMMON_ANCESTOR);
    return baseSha;
  }

  /** `git diff --raw -z` between two commits in the store. */
  public async rawDiff(workspaceId: string, baseSha: string, headSha: string) {
    const { stdout } = await this.gitService.run(this.storePath(workspaceId), [
      'diff',
      '--raw',
      '-z',
      '--no-abbrev',
      ...DIFF_OPTIONS,
      baseSha,
      headSha,
    ]);
    return stdout;
  }

  /** The unified patch between two commits in the store, listing files in the same order as `rawDiff`. */
  public async patch(workspaceId: string, baseSha: string, headSha: string) {
    const { stdout } = await this.gitService.run(this.storePath(workspaceId), [
      '-c',
      'core.quotePath=false',
      'diff',
      '--no-color',
      '--full-index',
      '--unified=3',
      '--src-prefix=a/',
      '--dst-prefix=b/',
      '--submodule=short',
      ...DIFF_OPTIONS,
      baseSha,
      headSha,
    ]);
    return stdout;
  }

  /** Whole-word, fixed-string matches of `word` in the commit's text files: path, 1-based line and line text. */
  public async grep(workspaceId: string, sha: string, word: string) {
    const { stdout } = await this.gitService.run(
      this.storePath(workspaceId),
      [
        '-c',
        'core.quotePath=false',
        'grep',
        '-z',
        '-n',
        '-m',
        String(MAX_GREP_HITS_PER_FILE),
        '-w',
        '-I',
        '-F',
        '--full-name',
        '-e',
        word,
        sha,
        '--',
      ],
      { allowFailure: true },
    );
    const prefix = `${sha}:`;
    return stdout
      .split('\n')
      .filter((row) => row.startsWith(prefix))
      .flatMap((row) => {
        const [filePath, line, ...text] = row.slice(prefix.length).split('\0');
        const lineNumber = Number(line);
        return filePath && Number.isInteger(lineNumber)
          ? [{ path: filePath, line: lineNumber, text: text.join('\0') }]
          : [];
      });
  }

  /** The newest commit in `baseSha..headSha` that touched the path. */
  public async lastCommit(workspaceId: string, baseSha: string, headSha: string, filePath: string) {
    const { stdout } = await this.gitService.run(
      this.storePath(workspaceId),
      ['log', '-1', '--format=%H%x00%an%x00%at', `${baseSha}..${headSha}`, '--', filePath],
      { allowFailure: true },
    );
    const [sha, author, time] = stdout.trim().split('\0');
    if (!sha || author === undefined || !time) return undefined;
    return { sha, author, committedAt: new Date(Number(time) * 1000) };
  }

  /** Commit messages in `baseSha..headSha`, oldest first. */
  public async commitMessages(workspaceId: string, baseSha: string, headSha: string, limit: number) {
    const { stdout } = await this.gitService.run(
      this.storePath(workspaceId),
      ['log', '--reverse', `--max-count=${limit}`, '--format=%B%x00', `${baseSha}..${headSha}`],
      { allowFailure: true },
    );
    return stdout
      .split('\0')
      .map((message) => message.trim())
      .filter(Boolean);
  }

  /**
   * Checks a commit out into a folder of its own, for an agent to read. The checkout belongs to the
   * store, never to the user's repository.
   */
  public async addWorktree(workspaceId: string, sha: string, folder: string) {
    await this.mutex.run(workspaceId, async () => {
      await this.gitService.run(this.storePath(workspaceId), ['worktree', 'add', '--detach', '--force', folder, sha]);
    });
  }

  public async removeWorktree(workspaceId: string, folder: string) {
    await this.mutex.run(workspaceId, async () => {
      const storePath = this.storePath(workspaceId);
      await this.gitService.run(storePath, ['worktree', 'remove', '--force', folder], { allowFailure: true });
      await rm(folder, { recursive: true, force: true });
      await this.gitService.run(storePath, ['worktree', 'prune'], { allowFailure: true });
    });
  }

  /** Reads files of a commit by path, leaving out missing ones and any larger than `maxBytes`. */
  public async readFiles(workspaceId: string, sha: string, paths: readonly string[], maxBytes: number) {
    const unique = [...new Set(paths)].filter((filePath) => !filePath.includes('\n'));
    if (unique.length === 0) return new Map<string, string>();
    const resolved = await this.gitService.output(this.storePath(workspaceId), ['cat-file', '--batch-check'], {
      input: `${unique.map((filePath) => `${sha}:${filePath}`).join('\n')}\n`,
    });
    // Output lines follow the input order: "<sha> <type> <size>", or "<name> missing".
    const blobShas = new Map<string, string>();
    for (const [index, line] of resolved.split('\n').entries()) {
      const [blobSha, type] = line.split(' ');
      const filePath = unique[index];
      if (filePath && blobSha && type === 'blob') blobShas.set(filePath, blobSha);
    }
    const blobs = await this.readBlobs(workspaceId, [...blobShas.values()], maxBytes);
    const files = new Map<string, string>();
    for (const [filePath, blobSha] of blobShas) {
      const blob = blobs.get(blobSha);
      if (blob) files.set(filePath, blob.toString('utf8'));
    }
    return files;
  }

  /** Reads blobs from the store by id, leaving out any larger than `maxBytes`. */
  public async readBlobs(workspaceId: string, shas: readonly string[], maxBytes: number) {
    const storePath = this.storePath(workspaceId);
    const blobs = new Map<string, Buffer>();
    const unique = [...new Set(shas)];

    for (let start = 0; start < unique.length; start += BLOB_BATCH_SIZE) {
      const batch = unique.slice(start, start + BLOB_BATCH_SIZE);
      const sizes = await this.gitService.output(storePath, ['cat-file', '--batch-check=%(objectname) %(objectsize)'], {
        input: `${batch.join('\n')}\n`,
      });
      const readable = sizes
        .split('\n')
        .map((line) => line.split(' '))
        .filter(([, size]) => size !== undefined && Number(size) <= maxBytes)
        .map(([sha = '']) => sha);
      if (readable.length === 0) continue;

      const { stdout } = await this.gitService.runBuffer(storePath, ['cat-file', '--batch'], {
        input: `${readable.join('\n')}\n`,
      });
      // Each object is "<sha> <type> <size>\n<content>\n".
      let offset = 0;
      while (offset < stdout.length) {
        const headerEnd = stdout.indexOf(0x0a, offset);
        if (headerEnd === -1) break;
        const [sha = '', , size = '0'] = stdout.subarray(offset, headerEnd).toString('utf8').split(' ');
        const contentEnd = headerEnd + 1 + Number(size);
        blobs.set(sha, stdout.subarray(headerEnd + 1, contentEnd));
        offset = contentEnd + 1;
      }
    }
    return blobs;
  }

  /** Pins a snapshot's commits so the store keeps them for as long as the snapshot exists. */
  public async pin(workspaceId: string, snapshotId: string, shas: iSnapshotShas) {
    const input = pinnedRefs(snapshotId, shas)
      .map(([ref, sha]) => `update ${ref} ${sha}\n`)
      .join('');
    await this.gitService.run(this.storePath(workspaceId), ['update-ref', '--stdin'], { input });
  }

  public async unpin(workspaceId: string, snapshotId: string, shas: iSnapshotShas) {
    const input = pinnedRefs(snapshotId, shas)
      .map(([ref]) => `delete ${ref}\n`)
      .join('');
    await this.gitService.run(this.storePath(workspaceId), ['update-ref', '--stdin'], { input, allowFailure: true });
  }

  /** Deletes the workspace's store and every snapshot pinned in it. */
  public async removeStore(workspaceId: string) {
    await this.mutex.run(workspaceId, async () => {
      await rm(this.storePath(workspaceId), { recursive: true, force: true });
    });
  }

  private async ensureStore(workspace: { id: string; repoPath: string }) {
    const storePath = this.storePath(workspace.id);
    if (await pathExists(path.join(storePath, 'HEAD'))) return storePath;

    // A SHA-256 repository can only be fetched into a store that uses the same object format.
    const objectFormat = await this.gitService.run(workspace.repoPath, ['rev-parse', '--show-object-format'], {
      allowFailure: true,
    });
    const format = objectFormat.exitCode === 0 ? objectFormat.stdout.trim() : '';
    await mkdir(storePath, { recursive: true });
    await this.gitService.run(storePath, [
      'init',
      '--bare',
      '--quiet',
      ...(format ? [`--object-format=${format}`] : []),
    ]);
    return storePath;
  }
}
