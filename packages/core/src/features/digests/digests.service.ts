import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_LABELS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { DIGEST_REPOSITORY_TOKEN, DIGEST_REVISION_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { AgentAdaptersService } from '@~/features/agents/agent-adapters.service';
import { AgentCheckoutService } from '@~/features/agents/agent-checkout.service';
import { AgentCommandsService } from '@~/features/agents/agent-commands.service';
import { agentFailureMessage } from '@~/features/agents/agent-failure.utils';
import { AgentRuns } from '@~/features/agents/agent-runs';
import type { iAgentCheckout } from '@~/features/agents/agents.types';
import { createLatestThrottle } from '@~/features/agents/latest-throttle.utils';
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

import { checkDigest } from './digest-check.utils';
import { AGENT_DIGEST_JSON_SCHEMA, agentDigestSchema } from './digest-output.schema';
import { fitPatch } from './digest-patch.utils';
import { previewOf } from './digest-preview.utils';
import { shortIdsOf, toPromptUnits } from './digest-prompt-units.utils';
import { buildDigestPrompt } from './digest-prompt.utils';
import type { iDigestRepository } from './digest.repository';
import type { iDigestPreview, iDigestRecord, iDigestStartOptions } from './digests.types';
import type { iDigestRevisionRepository } from './revisions/digest-revision.repository';
import { DigestRevisionResolver } from './revisions/digest-revision.resolver';
import { applyRevisions } from './revisions/digest-revision.utils';

const DIGESTS_DIRECTORY = 'digests';
/**
 * Characters of diff put in the prompt. Files past this are outlined, and the agent reads their diffs from the
 * diff folder as it needs them, so a long merge request doesn't arrive as one huge prompt.
 */
const MAX_PROMPT_PATCH_CHARS = 30_000;
const MAX_COMMIT_MESSAGES = 50;
/** A digest that takes longer than this is stopped. */
const DIGEST_TIMEOUT_MS = 20 * 60 * 1000;
/** Progress is written at most this often, so a chatty agent doesn't hammer the database. */
const PROGRESS_INTERVAL_MS = 400;

/**
 * AI digests: a coding agent already installed on this machine reads a disposable, read-only checkout
 * of the snapshot and proposes groupings, a reading order and notes. The answer is checked before it is
 * kept, and the review never waits for it.
 */
@singleton()
export class DigestsService {
  private readonly runs = new AgentRuns();

  private readonly logger;

  constructor(
    @inject(DIGEST_REPOSITORY_TOKEN) private readonly digestRepository: iDigestRepository,
    @inject(DIGEST_REVISION_REPOSITORY_TOKEN) private readonly revisionRepository: iDigestRevisionRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly revisionResolver: DigestRevisionResolver,
    private readonly reviewsService: ReviewsService,
    private readonly snapshotStoreService: SnapshotStoreService,
    private readonly agentAdaptersService: AgentAdaptersService,
    private readonly agentCheckoutService: AgentCheckoutService,
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
    const digest = await this.digestRepository.findLatest(snapshotId);
    return digest ? this.respond(digest) : null;
  }

  /** The digest as the reviewer reads it: each part's selected version in place, and every version listed. */
  public async respond(digest: iDigestRecord) {
    const revisions = await this.revisionRepository.listForDigest(digest.id);
    return {
      ...digest,
      content: digest.content && applyRevisions(digest.content, revisions),
      revisions: revisions.map((revision) => this.revisionResolver.toRevisionResponse(revision)),
    };
  }

  public async runners() {
    return this.agentCommandsService.runners();
  }

  public async start(snapshotId: string, runner: DigestRunner, options: iDigestStartOptions) {
    const { snapshot, target } = await this.reviewsService.getContext(snapshotId);
    const latest = await this.digestRepository.findLatest(snapshotId);
    if (latest?.status === DIGEST_STATUSES.RUNNING && this.runs.has(latest.id)) {
      throw ORPCBadRequestError(errorCodes.DIGEST_ALREADY_RUNNING);
    }
    const command = await this.agentCommandsService.resolve(runner);

    const digest = await this.digestRepository.create(snapshotId, runner, options);
    this.runs.start(
      digest.id,
      async (signal) => this.write(digest.id, command, runner, options, snapshot, target, signal),
      {
        timeoutMs: DIGEST_TIMEOUT_MS,
        timeoutMessage: 'The digest took too long and was stopped',
        onError: (error) => this.logger.error('Digest failed', { digestId: digest.id, error: String(error) }),
      },
    );
    return this.respond(digest);
  }

  public async cancel(digestId: string) {
    const digest = await this.digestRepository.findById(digestId);
    if (!digest) throw ORPCNotFoundError(errorCodes.DIGEST_NOT_FOUND);
    if (digest.status !== DIGEST_STATUSES.RUNNING) return this.respond(digest);
    const cancelled = await this.digestRepository.update(digestId, {
      status: DIGEST_STATUSES.CANCELLED,
      progress: null,
      preview: null,
      finishedAt: new Date(),
    });
    this.runs.abort(digestId, 'Stopped');
    return this.respond(cancelled ?? digest);
  }

  /** Called once at startup: nothing can still be running from an earlier launch. */
  public async failInterrupted() {
    await this.digestRepository.failRunning('Chaff closed while the digest was being written');
  }

  /** Stops every running agent; used when the app quits. */
  public stopAll() {
    this.runs.stopAll();
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
    const progress = createLatestThrottle((text: string) => {
      this.digestRepository.update(digestId, { progress: text }).catch(() => undefined);
    }, PROGRESS_INTERVAL_MS);
    let writtenPreview: string | undefined;
    const preview = createLatestThrottle((latest: iDigestPreview) => {
      const serialized = JSON.stringify(latest);
      if (serialized === writtenPreview || signal.aborted) return;
      writtenPreview = serialized;
      this.digestRepository.update(digestId, { preview: latest }).catch(() => undefined);
    }, PROGRESS_INTERVAL_MS);
    const stopWriting = () => {
      progress.stop();
      preview.stop();
    };

    try {
      progress.push('Checking out the snapshot');
      await this.agentCheckoutService.withCheckout(
        target.workspaceId,
        snapshot,
        { directory: DIGESTS_DIRECTORY, runId: digestId },
        async (checkout) => {
          const { prompt, unitIds, shortIds, outlinedPaths } = await this.preparePrompt(
            snapshot,
            target,
            checkout,
            instructions,
          );
          progress.push(`Starting ${DIGEST_RUNNER_LABELS.get(runner)}`);
          const answer = await this.agentAdaptersService.adapterFor(runner).run(command, {
            cwd: checkout.checkout,
            scratchDir: checkout.scratchDir,
            diffDirectory: checkout.diffDirectory,
            prompt,
            model,
            schema: AGENT_DIGEST_JSON_SCHEMA,
            signal,
            onProgress: progress.push,
            onPartialAnswer: (partial) => {
              const latest = previewOf(partial, unitIds.length);
              if (latest) preview.push(latest);
            },
          });
          stopWriting();
          const parsed = agentDigestSchema.safeParse(answer);
          if (!parsed.success) throw new Error('The agent answered in an unexpected shape');
          const content = { ...(await checkDigest(parsed.data, unitIds, shortIds, checkout.checkout)), outlinedPaths };
          await this.changeUnitsService.adoptDigest(snapshot.id, content);
          await this.digestRepository.update(digestId, {
            status: DIGEST_STATUSES.READY,
            content,
            progress: null,
            preview: null,
            finishedAt: new Date(),
          });
        },
      );
    } catch (error) {
      stopWriting();
      // A cancelled digest is already marked; anything else that stops the run is a failure.
      const current = await this.digestRepository.findById(digestId);
      if (current?.status === DIGEST_STATUSES.RUNNING) {
        await this.digestRepository.update(digestId, {
          status: DIGEST_STATUSES.FAILED,
          error: agentFailureMessage(error, signal),
          progress: null,
          preview: null,
          finishedAt: new Date(),
        });
      }
      throw error;
    }
  }

  private async preparePrompt(
    snapshot: iSnapshotRecord,
    target: iReviewTargetRecord,
    { patch: fullPatch, diffDirectory }: iAgentCheckout,
    instructions?: string,
  ) {
    const [units, files, commits, preferences, change] = await Promise.all([
      this.snapshotRepository.listUnits(snapshot.id),
      this.snapshotRepository.listFiles(snapshot.id),
      this.snapshotStoreService.commitMessages(
        target.workspaceId,
        snapshot.baseSha,
        snapshot.headSha,
        MAX_COMMIT_MESSAGES,
      ),
      this.preferencesService.texts(target.workspaceId),
      target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST
        ? this.remoteChangesService.describe(target).catch(() => undefined)
        : undefined,
    ]);
    const { patch, outlined } = fitPatch(fullPatch, MAX_PROMPT_PATCH_CHARS);
    const promptUnits = toPromptUnits(units, files);
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
      shortIds: shortIdsOf(promptUnits),
      outlinedPaths: outlined.map((file) => file.path),
    };
  }
}
