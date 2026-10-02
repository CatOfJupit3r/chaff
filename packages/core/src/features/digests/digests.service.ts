import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { DIGEST_INLINE_PATCH_THRESHOLD_CHARS } from '@chaff/common/constants/agents.constants';
import { DIGEST_RUNNER_LABELS, DIGEST_RUNNERS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import type { DigestDiffMode, DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { FILE_STATUSES, REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN, DIGEST_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { AgentCommandsService } from '@~/features/agents/agent-commands.service';
import { RemoteChangesService } from '@~/features/code-hosts/remote-changes.service';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { PreferencesService } from '@~/features/preferences/preferences.service';
import { ChangeUnitsService } from '@~/features/reviews/change-units/change-units.service';
import { assignPatchSections, parsePatch, splitPatchSections } from '@~/features/reviews/diff/patch.utils';
import { parseRawDiff } from '@~/features/reviews/diff/raw-diff.utils';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { SettingsService } from '@~/features/settings/settings.service';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { ClaudeCodeAdapter } from './claude-code.adapter';
import { CodexAdapter } from './codex.adapter';
import { checkDigest } from './digest-check.utils';
import { buildChaffFolder, writeChaffFolder } from './digest-folder.utils';
import type { iFolderFile } from './digest-folder.utils';
import { AGENT_DIGEST_JSON_SCHEMA, agentDigestSchema } from './digest-output.schema';
import { outlinePatch, planPromptDiff } from './digest-patch.utils';
import { previewOf } from './digest-preview.utils';
import { buildDigestPrompt } from './digest-prompt.utils';
import type { iDigestRepository } from './digest.repository';
import type { iDigestPreview, iDigestRunnerAdapter, iDigestStartInput, iPromptUnit } from './digests.types';

const DIGESTS_DIRECTORY = 'digests';
/** Characters of diff an inline prompt carries at most; files past this are outlined and read from `.chaff/`. */
const MAX_PROMPT_PATCH_CHARS = 120_000;
/** Largest parent-side file written to `.chaff/base/`. */
const MAX_BASE_FILE_BYTES = 2 * 1024 * 1024;
const MAX_COMMIT_MESSAGES = 50;
/** A digest that takes longer than this is stopped. */
const DIGEST_TIMEOUT_MS = 20 * 60 * 1000;
/** Progress is written at most this often, so a chatty agent doesn't hammer the database. */
const PROGRESS_INTERVAL_MS = 400;

/** One digest being written, with everything settled before the agent starts. */
interface iDigestRun {
  digestId: string;
  command: string;
  runner: DigestRunner;
  model: string | undefined;
  instructions: string;
  diffMode: DigestDiffMode;
  snapshot: iSnapshotRecord;
  target: iReviewTargetRecord;
}

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
    private readonly settingsService: SettingsService,
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

  public async start({ snapshotId, runner, model: pickedModel, instructions: pickedInstructions }: iDigestStartInput) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    const latest = await this.digestRepository.findLatest(snapshotId);
    if (latest?.status === DIGEST_STATUSES.RUNNING && this.running.has(latest.id)) {
      throw ORPCBadRequestError(errorCodes.DIGEST_ALREADY_RUNNING);
    }
    const settings = await this.settingsService.get();
    const chosenModel = (
      pickedModel ??
      settings.agentModels.find((candidate) => candidate.runner === runner)?.model ??
      ''
    ).trim();
    const model = chosenModel === '' ? undefined : chosenModel;
    if (model !== undefined && !isSafeAgentModel(model)) throw ORPCBadRequestError(errorCodes.INVALID_AGENT_MODEL);
    const instructions = pickedInstructions ?? settings.digestInstructions;
    const command = await this.agentCommandsService.resolve(runner);

    const digest = await this.digestRepository.create(snapshotId, runner, model);
    const controller = new AbortController();
    this.running.set(digest.id, controller);
    const timeout = setTimeout(
      () => controller.abort(new Error('The digest took too long and was stopped')),
      DIGEST_TIMEOUT_MS,
    );
    const run = {
      digestId: digest.id,
      command,
      runner,
      model,
      instructions,
      diffMode: settings.digestDiffMode,
      snapshot,
      target,
    };
    this.write(run, controller.signal)
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
    { digestId, command, runner, model, instructions, diffMode, snapshot, target }: iDigestRun,
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
      const { prompt, notes, unitIds, shortIds, outlinedPaths } = await this.preparePrompt(
        snapshot,
        target,
        instructions,
        diffMode,
      );
      await writeChaffFolder(checkout, notes);
      onProgress(`Starting ${DIGEST_RUNNER_LABELS(runner)}`);
      const answer = await this.adapterFor(runner).run(command, {
        cwd: checkout,
        scratchDir,
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

  /** Each changed file with its patch and, when it had one, its parent side, for the `.chaff/` folder. */
  private async folderFiles(workspaceId: string, baseSha: string, headSha: string, fullPatch: string) {
    const entries = parseRawDiff(await this.snapshotStoreService.rawDiff(workspaceId, baseSha, headSha));
    const patches = assignPatchSections(entries, splitPatchSections(fullPatch));
    const withPatches = entries.map((entry, index) => {
      const patch = patches[index] ?? '';
      const [outline] = outlinePatch(patch);
      return { entry, patch, outline, isBinary: parsePatch(patch).isBinary };
    });
    const bases = await this.snapshotStoreService.readBlobs(
      workspaceId,
      withPatches.flatMap(({ entry, isBinary }) =>
        entry.status !== FILE_STATUSES.ADDED && !isBinary && entry.oldBlobSha ? [entry.oldBlobSha] : [],
      ),
      MAX_BASE_FILE_BYTES,
    );
    return withPatches.map(({ entry, patch, outline, isBinary }): iFolderFile => {
      const base = entry.oldBlobSha && !isBinary ? bases.get(entry.oldBlobSha) : undefined;
      return {
        path: entry.path,
        oldPath: entry.oldPath,
        status: entry.status,
        additions: outline?.additions ?? 0,
        deletions: outline?.deletions ?? 0,
        patch,
        base: entry.status === FILE_STATUSES.ADDED ? undefined : base?.toString('utf8'),
      };
    });
  }

  private async preparePrompt(
    snapshot: iSnapshotRecord,
    target: iReviewTargetRecord,
    instructions: string,
    diffMode: DigestDiffMode,
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
    const { delivery, patch, outlined } = planPromptDiff(
      diffMode,
      fullPatch,
      DIGEST_INLINE_PATCH_THRESHOLD_CHARS,
      MAX_PROMPT_PATCH_CHARS,
    );
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
    const notes = buildChaffFolder({
      baseSha: snapshot.baseSha,
      headSha: snapshot.headSha,
      files: await this.folderFiles(target.workspaceId, snapshot.baseSha, snapshot.headSha, fullPatch),
      units: promptUnits,
    });
    const prompt = buildDigestPrompt({
      branch: target.branch,
      parentBranch: snapshot.parentBranch,
      baseSha: snapshot.baseSha,
      headSha: snapshot.headSha,
      commits,
      units: promptUnits,
      delivery,
      patch,
      outlined,
      change,
      preferences,
      instructions,
    });
    return {
      prompt,
      notes,
      unitIds: units.map((unit) => unit.id),
      shortIds: new Map(promptUnits.map((unit) => [unit.shortId, unit.unitId])),
      outlinedPaths: outlined.map((file) => file.path),
    };
  }
}
