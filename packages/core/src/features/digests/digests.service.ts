import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNERS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN, DIGEST_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { AgentCommandsService } from '@~/features/agents/agent-commands.service';
import { RemoteChangesService } from '@~/features/code-hosts/remote-changes.service';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { PreferencesService } from '@~/features/preferences/preferences.service';
import { ChangeUnitsService } from '@~/features/reviews/change-units/change-units.service';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { ClaudeCodeAdapter } from './claude-code.adapter';
import { CodexAdapter } from './codex.adapter';
import { checkDigest } from './digest-check.utils';
import { writeDiffFiles } from './digest-diff-files.utils';
import { AGENT_DIGEST_JSON_SCHEMA, agentDigestSchema } from './digest-output.schema';
import { fitPatch } from './digest-patch.utils';
import { previewOf } from './digest-preview.utils';
import { buildDigestPrompt } from './digest-prompt.utils';
import type { iDigestRepository } from './digest.repository';
import type { iDigestPreview, iDigestRunnerAdapter, iDigestStartOptions, iPromptUnit } from './digests.types';

const DIGESTS_DIRECTORY = 'digests';
/**
 * Characters of diff put in the prompt. Files past this are outlined, and the agent reads their diffs from the
 * diff folder as it needs them, so a long merge request doesn't arrive as one huge prompt.
 */
const MAX_PROMPT_PATCH_CHARS = 30_000;
/** Folder in the digest's scratch space holding every file's diff. */
const DIFF_DIRECTORY = 'diff';
const MAX_COMMIT_MESSAGES = 50;
/** A digest that takes longer than this is stopped. */
const DIGEST_TIMEOUT_MS = 20 * 60 * 1000;
/** Progress is written at most this often, so a chatty agent doesn't hammer the database. */
const PROGRESS_INTERVAL_MS = 400;

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
    private readonly agentCommandsService: AgentCommandsService,
    private readonly preferencesService: PreferencesService,
    private readonly changeUnitsService: ChangeUnitsService,
    private readonly remoteChangesService: RemoteChangesService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('digests');
  }

  public async get(snapshotId: string) {
    await this.reviewsService.getContext(snapshotId);
    return (await this.digestRepository.findLatest(snapshotId)) ?? null;
  }

  public async runners() {
    return this.agentCommandsService.runners();
  }

  public async start(snapshotId: string, runner: DigestRunner, options: iDigestStartOptions) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    const latest = await this.digestRepository.findLatest(snapshotId);
    if (latest?.status === DIGEST_STATUSES.RUNNING && this.running.has(latest.id)) {
      throw ORPCBadRequestError(errorCodes.DIGEST_ALREADY_RUNNING);
    }
    const command = await this.agentCommandsService.resolve(runner);

    const digest = await this.digestRepository.create(snapshotId, runner, options);
    const controller = new AbortController();
    this.running.set(digest.id, controller);
    const timeout = setTimeout(
      () => controller.abort(new Error('The digest took too long and was stopped')),
      DIGEST_TIMEOUT_MS,
    );
    this.write(digest.id, command, runner, options, snapshot, target, controller.signal)
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
      preview: null,
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

  private adapterFor(runner: DigestRunner): iDigestRunnerAdapter {
    return runner === DIGEST_RUNNERS.CODEX ? this.codexAdapter : this.claudeCodeAdapter;
  }

  private async write(
    digestId: string,
    command: string,
    runner: DigestRunner,
    { model, instructions }: iDigestStartOptions,
    snapshot: iSnapshotRecord,
    target: iReviewTargetRecord,
    signal: AbortSignal,
  ) {
    const folder = path.join(this.options.dataDir, DIGESTS_DIRECTORY, digestId);
    const checkout = path.join(folder, 'checkout');
    const scratchDir = path.join(folder, 'scratch');
    const diffDirectory = path.join(scratchDir, DIFF_DIRECTORY);
    let lastProgressAt = 0;
    const onProgress = (progress: string) => {
      const now = Date.now();
      if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
      lastProgressAt = now;
      this.digestRepository.update(digestId, { progress }).catch(() => undefined);
    };
    // The preview is written at most once per interval, always ending with the newest one received.
    let latestPreview: iDigestPreview | undefined;
    let writtenPreview: string | undefined;
    let previewWrittenAt = 0;
    let previewTimer: ReturnType<typeof setTimeout> | undefined;
    const writePreview = () => {
      previewTimer = undefined;
      const serialized = JSON.stringify(latestPreview);
      if (!latestPreview || serialized === writtenPreview || signal.aborted) return;
      writtenPreview = serialized;
      previewWrittenAt = Date.now();
      this.digestRepository.update(digestId, { preview: latestPreview }).catch(() => undefined);
    };
    const showPreview = (preview: iDigestPreview | undefined) => {
      if (!preview) return;
      latestPreview = preview;
      previewTimer ??= setTimeout(writePreview, Math.max(0, previewWrittenAt + PROGRESS_INTERVAL_MS - Date.now()));
    };
    const stopPreview = () => clearTimeout(previewTimer);

    try {
      await mkdir(scratchDir, { recursive: true });
      onProgress('Checking out the snapshot');
      await this.snapshotStoreService.addWorktree(target.workspaceId, snapshot.headSha, checkout);
      const { prompt, unitIds, shortIds, outlinedPaths } = await this.preparePrompt(
        snapshot,
        target,
        diffDirectory,
        instructions,
      );
      onProgress(`Starting ${DIGEST_RUNNER_LABELS(runner)}`);
      const answer = await this.adapterFor(runner).run(command, {
        cwd: checkout,
        scratchDir,
        diffDirectory,
        prompt,
        model,
        schema: AGENT_DIGEST_JSON_SCHEMA,
        signal,
        onProgress,
        onPartialAnswer: (partial) => showPreview(previewOf(partial, unitIds.length)),
      });
      stopPreview();
      const parsed = agentDigestSchema.safeParse(answer);
      if (!parsed.success) throw new Error('The agent answered in an unexpected shape');
      const content = { ...checkDigest(parsed.data, unitIds, shortIds, checkout), outlinedPaths };
      await this.changeUnitsService.adoptDigest(snapshot.id, content);
      await this.digestRepository.update(digestId, {
        status: DIGEST_STATUSES.READY,
        content,
        progress: null,
        preview: null,
        finishedAt: new Date(),
      });
    } catch (error) {
      stopPreview();
      // A cancelled digest is already marked; anything else that stops the run is a failure.
      const current = await this.digestRepository.findById(digestId);
      if (current?.status === DIGEST_STATUSES.RUNNING) {
        const reason: unknown = signal.aborted ? signal.reason : error;
        await this.digestRepository.update(digestId, {
          status: DIGEST_STATUSES.FAILED,
          error: reason instanceof Error ? reason.message : String(reason),
          progress: null,
          preview: null,
          finishedAt: new Date(),
        });
      }
      throw error;
    } finally {
      await this.snapshotStoreService.removeWorktree(target.workspaceId, checkout).catch(() => undefined);
      await rm(folder, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async preparePrompt(
    snapshot: iSnapshotRecord,
    target: iReviewTargetRecord,
    diffDirectory: string,
    instructions?: string,
  ) {
    const [units, files, commits, fullPatch, preferences, change] = await Promise.all([
      this.snapshotRepository.listUnits(snapshot.id),
      this.snapshotRepository.listFiles(snapshot.id),
      this.snapshotStoreService.commitMessages(
        target.workspaceId,
        snapshot.baseSha,
        snapshot.headSha,
        MAX_COMMIT_MESSAGES,
      ),
      this.snapshotStoreService.patch(target.workspaceId, snapshot.baseSha, snapshot.headSha),
      this.preferencesService.texts(target.workspaceId),
      target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST
        ? this.remoteChangesService.describe(target).catch(() => undefined)
        : undefined,
    ]);
    await writeDiffFiles(diffDirectory, fullPatch);
    const { patch, outlined } = fitPatch(fullPatch, MAX_PROMPT_PATCH_CHARS);
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
      patch,
      outlined,
      diffDirectory,
      change,
      preferences,
      instructions,
    });
    return {
      prompt,
      unitIds: units.map((unit) => unit.id),
      shortIds: new Map(promptUnits.map((unit) => [unit.shortId, unit.unitId])),
      outlinedPaths: outlined.map((file) => file.path),
    };
  }
}
