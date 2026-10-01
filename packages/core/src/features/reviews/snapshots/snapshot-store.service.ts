import { mkdir, rm } from 'node:fs/promises';
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
