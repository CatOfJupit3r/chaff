import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import {
  DIGEST_RUNNER_LABELS,
  DIGEST_RUNNERS,
  DIGEST_STATUSES,
  digestRunnerValues,
} from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN, DIGEST_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { ORPCBadRequestError, ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { resolveExecutable } from './agent-process';
import { ClaudeCodeAdapter } from './claude-code.adapter';
import { CodexAdapter } from './codex.adapter';
import { checkDigest } from './digest-check.utils';
import { agentDigestSchema } from './digest-output.schema';
import { buildDigestPrompt } from './digest-prompt.utils';
import type { iDigestRepository } from './digest.repository';
import type { iDigestRunnerAdapter, iPromptUnit } from './digests.types';

const DIGESTS_DIRECTORY = 'digests';
/** Characters of diff put in the prompt; the agent reads files for anything past this. */
const MAX_PROMPT_PATCH_CHARS = 120_000;
const MAX_COMMIT_MESSAGES = 50;
/** A digest that takes longer than this is stopped. */
const DIGEST_TIMEOUT_MS = 20 * 60 * 1000;
/** Progress is written at most this often, so a chatty agent doesn't hammer the database. */
const PROGRESS_INTERVAL_MS = 400;

const DEFAULT_COMMANDS = {
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'claude',
  [DIGEST_RUNNERS.CODEX]: 'codex',
} satisfies Record<DigestRunner, string>;

const lineRange = (start?: number, end?: number) =>
  start === undefined || end === undefined ? undefined : `${start}-${end}`;

/**
 * AI digests: a coding agent already installed on this machine reads a disposable, read-only checkout
 * of the snapshot and proposes groupings, a reading order and notes. The answer is checked before it is
 * kept, and the review never waits for it.
 */
@singleton()
export class DigestsService {
  private readonly running = new Map<string, AbortController>();

  private readonly logger;

  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    @inject(DIGEST_REPOSITORY_TOKEN) private readonly digestRepository: iDigestRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
    private readonly snapshotStoreService: SnapshotStoreService,
    private readonly claudeCodeAdapter: ClaudeCodeAdapter,
    private readonly codexAdapter: CodexAdapter,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('digests');
  }

  public async get(snapshotId: string) {
    await this.reviewsService.getContext(snapshotId);
    return (await this.digestRepository.findLatest(snapshotId)) ?? null;
  }

  public async runners() {
    return Promise.all(
      digestRunnerValues.map(async (runner) => {
        const found = await resolveExecutable(this.commandFor(runner));
        return { runner, isAvailable: found !== undefined, path: found };
      }),
    );
  }

  public async start(snapshotId: string, runner: DigestRunner) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    const latest = await this.digestRepository.findLatest(snapshotId);
    if (latest?.status === DIGEST_STATUSES.RUNNING && this.running.has(latest.id)) {
      throw ORPCBadRequestError(errorCodes.DIGEST_ALREADY_RUNNING);
    }
    const command = await resolveExecutable(this.commandFor(runner));
    if (!command) {
      throw ORPCUnprocessableContentError(errorCodes.DIGEST_RUNNER_UNAVAILABLE, {
        runner: DIGEST_RUNNER_LABELS(runner),
      });
    }

    const digest = await this.digestRepository.create(snapshotId, runner);
    const controller = new AbortController();
    this.running.set(digest.id, controller);
    const timeout = setTimeout(
      () => controller.abort(new Error('The digest took too long and was stopped')),
      DIGEST_TIMEOUT_MS,
    );
    this.write(digest.id, command, runner, snapshot, target, controller.signal)
      .catch((error: unknown) => this.logger.error('Digest failed', { digestId: digest.id, error: String(error) }))
      .finally(() => {
        clearTimeout(timeout);
        this.running.delete(digest.id);
      });
    return digest;
  }

  public async cancel(digestId: string) {
    const digest = await this.digestRepository.findById(digestId);
    if (!digest) throw ORPCNotFoundError(errorCodes.DIGEST_NOT_FOUND);
    if (digest.status !== DIGEST_STATUSES.RUNNING) return digest;
    const cancelled = await this.digestRepository.update(digestId, {
      status: DIGEST_STATUSES.CANCELLED,
      progress: null,
      finishedAt: new Date(),
    });
    this.running.get(digestId)?.abort(new Error('Stopped'));
    return cancelled ?? digest;
  }

  /** Called once at startup: nothing can still be running from an earlier launch. */
  public async failInterrupted() {
    await this.digestRepository.failRunning('Chaff closed while the digest was being written');
  }

  /** Stops every running agent; used when the app quits. */
  public stopAll() {
    for (const controller of this.running.values()) controller.abort(new Error('Chaff is closing'));
  }

  private commandFor(runner: DigestRunner) {
    return this.options.agentCommands?.get(runner) ?? DEFAULT_COMMANDS[runner];
  }

  private adapterFor(runner: DigestRunner): iDigestRunnerAdapter {
    return runner === DIGEST_RUNNERS.CODEX ? this.codexAdapter : this.claudeCodeAdapter;
  }

  private async write(
    digestId: string,
    command: string,
    runner: DigestRunner,
    snapshot: iSnapshotRecord,
    target: { workspaceId: string; branch: string },
    signal: AbortSignal,
  ) {
    const folder = path.join(this.options.dataDir, DIGESTS_DIRECTORY, digestId);
    const checkout = path.join(folder, 'checkout');
    const scratchDir = path.join(folder, 'scratch');
    let lastProgressAt = 0;
    const onProgress = (progress: string) => {
      const now = Date.now();
      if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
      lastProgressAt = now;
      this.digestRepository.update(digestId, { progress }).catch(() => undefined);
    };

    try {
      await mkdir(scratchDir, { recursive: true });
      onProgress('Checking out the snapshot');
      await this.snapshotStoreService.addWorktree(target.workspaceId, snapshot.headSha, checkout);
      const { prompt, unitIds, shortIds } = await this.preparePrompt(snapshot, target);
      onProgress(`Starting ${DIGEST_RUNNER_LABELS(runner)}`);
      const answer = await this.adapterFor(runner).run(command, {
        cwd: checkout,
        scratchDir,
        prompt,
        signal,
        onProgress,
      });
      const parsed = agentDigestSchema.safeParse(answer);
      if (!parsed.success) throw new Error('The agent answered in an unexpected shape');
      await this.digestRepository.update(digestId, {
        status: DIGEST_STATUSES.READY,
        content: checkDigest(parsed.data, unitIds, shortIds, checkout),
        progress: null,
        finishedAt: new Date(),
      });
    } catch (error) {
      // A cancelled digest is already marked; anything else that stops the run is a failure.
      const current = await this.digestRepository.findById(digestId);
      if (current?.status === DIGEST_STATUSES.RUNNING) {
        const reason: unknown = signal.aborted ? signal.reason : error;
        await this.digestRepository.update(digestId, {
          status: DIGEST_STATUSES.FAILED,
          error: reason instanceof Error ? reason.message : String(reason),
          progress: null,
          finishedAt: new Date(),
        });
      }
      throw error;
    } finally {
      await this.snapshotStoreService.removeWorktree(target.workspaceId, checkout).catch(() => undefined);
      await rm(folder, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async preparePrompt(snapshot: iSnapshotRecord, target: { workspaceId: string; branch: string }) {
    const [units, files, commits, patch] = await Promise.all([
      this.snapshotRepository.listUnits(snapshot.id),
      this.snapshotRepository.listFiles(snapshot.id),
      this.snapshotStoreService.commitMessages(
        target.workspaceId,
        snapshot.baseSha,
        snapshot.headSha,
        MAX_COMMIT_MESSAGES,
      ),
      this.snapshotStoreService.patch(target.workspaceId, snapshot.baseSha, snapshot.headSha),
    ]);
    const paths = new Map(files.map((file) => [file.id, file.path]));
    const promptUnits: iPromptUnit[] = units.map((unit, index) => ({
      shortId: `u${index + 1}`,
      unitId: unit.id,
      kind: unit.kind,
      title: unit.title,
      path: paths.get(unit.fileId) ?? '',
      change: unit.change,
      oldLines: lineRange(unit.oldStartLine, unit.oldEndLine),
      newLines: lineRange(unit.newStartLine, unit.newEndLine),
      additions: unit.additions,
      deletions: unit.deletions,
    }));
    const prompt = buildDigestPrompt({
      branch: target.branch,
      parentBranch: snapshot.parentBranch,
      baseSha: snapshot.baseSha,
      headSha: snapshot.headSha,
      commits,
      units: promptUnits,
      patch: patch.slice(0, MAX_PROMPT_PATCH_CHARS),
      isPatchTruncated: patch.length > MAX_PROMPT_PATCH_CHARS,
    });
    return {
      prompt,
      unitIds: units.map((unit) => unit.id),
      shortIds: new Map(promptUnits.map((unit) => [unit.shortId, unit.unitId])),
    };
  }
}
