import { EventEmitter, on } from 'node:events';
import { watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { singleton } from 'tsyringe';

import { LoggerFactory } from '@~/features/logger/logger.factory';

import { GitService } from './git.service';

/** Git writes a ref in several steps (lock file, rename); changes inside this window count as one. */
const SETTLE_MS = 300;
/**
 * Folders of loose branch refs: local branches, and remote-tracking branches that `git fetch` moves. A branch
 * named `feat/x` lives in a subfolder.
 */
const REF_FOLDERS = ['refs/heads', 'refs/remotes'];
const REFS_FOLDER = 'refs';
/** Files directly in the git folder that move branches. */
const REF_FILES = new Set(['packed-refs']);
const CHANGE_EVENT = 'change';

interface iRepositoryWatch {
  emitter: EventEmitter;
  /** One watcher per folder: recursive watching misses repeated renames of the same file on Linux. */
  watchers: Map<string, FSWatcher>;
  /** Emits one change once git has finished writing. */
  notify: () => unknown;
  subscriberCount: number;
}

/**
 * Watches a repository's refs with the file system, so new commits, rebases and deleted branches are
 * noticed as they happen. Every subscriber of one repository shares its watchers. Only reads.
 */
@singleton()
export class RefWatchService {
  private readonly logger;

  private readonly repositories = new Map<string, iRepositoryWatch>();

  constructor(
    private readonly gitService: GitService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('ref-watch');
  }

  /** Yields the time of each change that may have moved a branch in the repository, until `signal` aborts. */
  public async *changes(repoPath: string, signal: AbortSignal) {
    const gitDirectory = await this.gitService.output(repoPath, [
      'rev-parse',
      '--path-format=absolute',
      '--git-common-dir',
    ]);
    const repository = await this.subscribe(gitDirectory);
    try {
      for await (const [changedAt] of on(repository.emitter, CHANGE_EVENT, { signal })) yield Number(changedAt);
    } catch (error) {
      if (!signal.aborted) throw error;
    } finally {
      this.unsubscribe(gitDirectory);
    }
  }

  private async subscribe(gitDirectory: string) {
    const existing = this.repositories.get(gitDirectory);
    if (existing) {
      existing.subscriberCount += 1;
      return existing;
    }
    const emitter = new EventEmitter();
    let settle: NodeJS.Timeout | undefined;
    const repository: iRepositoryWatch = {
      emitter,
      watchers: new Map(),
      notify: () => {
        clearTimeout(settle);
        settle = setTimeout(() => emitter.emit(CHANGE_EVENT, Date.now()), SETTLE_MS);
      },
      subscriberCount: 1,
    };
    this.repositories.set(gitDirectory, repository);
    const watchRefFolders = async () =>
      Promise.all(REF_FOLDERS.map(async (folder) => this.watchRefFolder(repository, path.join(gitDirectory, folder))));
    this.watchFolder(repository, gitDirectory, (name) => REF_FILES.has(name));
    // `refs/remotes` only appears with the first fetch of a repository that had no remote.
    this.watchFolder(
      repository,
      path.join(gitDirectory, REFS_FOLDER),
      (name) => REF_FOLDERS.some((folder) => path.basename(folder) === name),
      () => {
        watchRefFolders().catch(() => undefined);
      },
    );
    await watchRefFolders();
    return repository;
  }

  private unsubscribe(gitDirectory: string) {
    const repository = this.repositories.get(gitDirectory);
    if (!repository) return;
    repository.subscriberCount -= 1;
    if (repository.subscriberCount > 0) return;
    for (const watcher of repository.watchers.values()) watcher.close();
    repository.watchers.clear();
    this.repositories.delete(gitDirectory);
  }

  /**
   * Watches a ref folder and every subfolder in it, and picks up subfolders created later. A folder that does
   * not exist yet is picked up once it is created.
   */
  private async watchRefFolder(repository: iRepositoryWatch, root: string) {
    const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => undefined);
    if (!entries || repository.subscriberCount === 0) return;
    const folders = [
      root,
      ...entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(entry.parentPath, entry.name)),
    ];
    for (const [folder, watcher] of repository.watchers) {
      if (folder.startsWith(root) && !folders.includes(folder)) {
        watcher.close();
        repository.watchers.delete(folder);
      }
    }
    for (const folder of folders) {
      if (repository.watchers.has(folder)) continue;
      this.watchFolder(
        repository,
        folder,
        (name) => !name.endsWith('.lock'),
        () => {
          this.watchRefFolder(repository, root).catch(() => undefined);
        },
      );
    }
  }

  private watchFolder(
    repository: iRepositoryWatch,
    folder: string,
    isRelevant: (name: string) => boolean,
    onEntryChange?: () => unknown,
  ) {
    try {
      const watcher = watch(folder, (event, name) => {
        if (event === 'rename') onEntryChange?.();
        if (name && isRelevant(name)) repository.notify();
      });
      watcher.on('error', (error) => {
        this.logger.warn('Stopped watching refs', { folder, error: String(error) });
        watcher.close();
        repository.watchers.delete(folder);
      });
      repository.watchers.set(folder, watcher);
    } catch (error) {
      this.logger.warn('Could not watch refs', { folder, error: String(error) });
    }
  }
}
