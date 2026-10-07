import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { writeDiffFiles } from '@~/features/digests/digest-diff-files.utils';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';

import type { iAgentCheckout } from './agents.types';

/** Folder in the run's scratch space holding every file's diff. */
const DIFF_DIRECTORY = 'diff';

/** Disposable, read-only checkouts of a snapshot for a coding agent to read. */
@singleton()
export class AgentCheckoutService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly snapshotStoreService: SnapshotStoreService,
  ) {}

  /**
   * Checks the snapshot's head out under `<dataDir>/<directory>/<runId>`, with every changed file's diff in
   * a scratch folder beside it, runs `work` there, and removes both however it ends.
   */
  public async withCheckout<TResult>(
    workspaceId: string,
    snapshot: Pick<iSnapshotRecord, 'baseSha' | 'headSha'>,
    { directory, runId }: { directory: string; runId: string },
    work: (checkout: iAgentCheckout) => Promise<TResult>,
  ) {
    const folder = path.join(this.options.dataDir, directory, runId);
    const checkout = path.join(folder, 'checkout');
    const scratchDir = path.join(folder, 'scratch');
    const diffDirectory = path.join(scratchDir, DIFF_DIRECTORY);
    try {
      await mkdir(scratchDir, { recursive: true });
      const [patch] = await Promise.all([
        this.snapshotStoreService.patch(workspaceId, snapshot.baseSha, snapshot.headSha),
        this.snapshotStoreService.addWorktree(workspaceId, snapshot.headSha, checkout),
      ]);
      await writeDiffFiles(diffDirectory, patch);
      return await work({ checkout, scratchDir, diffDirectory, patch });
    } finally {
      await this.snapshotStoreService.removeWorktree(workspaceId, checkout).catch(() => undefined);
      await rm(folder, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
