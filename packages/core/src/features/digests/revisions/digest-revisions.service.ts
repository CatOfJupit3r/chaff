import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_LABELS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { DIGEST_REPOSITORY_TOKEN, DIGEST_REVISION_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { AgentAdaptersService } from '@~/features/agents/agent-adapters.service';
import { AgentCheckoutService } from '@~/features/agents/agent-checkout.service';
import { agentFailureMessage } from '@~/features/agents/agent-failure.utils';
import { AgentRuns } from '@~/features/agents/agent-runs';
import type { iAgentCheckout, iPickedAgent } from '@~/features/agents/agents.types';
import { createLatestThrottle } from '@~/features/agents/latest-throttle.utils';
import { fitPatch, splitPatch } from '@~/features/digests/digest-patch.utils';
import { shortIdsOf, toPromptUnits } from '@~/features/digests/digest-prompt-units.utils';
import type { iDigestRepository } from '@~/features/digests/digest.repository';
import { DigestsService } from '@~/features/digests/digests.service';
import type { iDigestRecord, iPromptUnit } from '@~/features/digests/digests.types';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { checkRevisedPart } from './digest-revision-check.utils';
import { AGENT_REVISION_JSON_SCHEMAS } from './digest-revision-output.schema';
import { buildRevisionPrompt } from './digest-revision-prompt.utils';
import {
  MAX_REVISION_PATCH_CHARS,
  REVISION_PROGRESS_INTERVAL_MS,
  REVISION_TIMEOUT_MS,
  REVISIONS_DIRECTORY,
} from './digest-revision.constants';
import type { iDigestRevisionRepository } from './digest-revision.repository';
import { applyRevisions, findPart, isSamePart } from './digest-revision.utils';
import type { iDigestPartRef, iRevisedPart } from './digest-revisions.types';

interface iRevisionRun {
  revisionId: string;
  digest: iDigestRecord;
  snapshot: iSnapshotRecord;
  target: iReviewTargetRecord;
  current: iRevisedPart;
  instructions: string;
}

/**
 * Rewrites of single digest parts: the coding agent picked in Settings rewrites the overview, a unit's note
 * or a diagram as the reviewer instructs, starting from the version shown. Every version is kept, and the
 * newest becomes the one shown once it is ready.
 */
@singleton()
export class DigestRevisionsService {
  private readonly runs = new AgentRuns();

  private readonly logger;

  constructor(
    @inject(DIGEST_REPOSITORY_TOKEN) private readonly digestRepository: iDigestRepository,
    @inject(DIGEST_REVISION_REPOSITORY_TOKEN) private readonly revisionRepository: iDigestRevisionRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
    private readonly digestsService: DigestsService,
    private readonly agentAdaptersService: AgentAdaptersService,
    private readonly agentCheckoutService: AgentCheckoutService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('digest-revisions');
  }

  public async revise(digestId: string, ref: iDigestPartRef, instructions: string) {
    const digest = await this.getDigest(digestId);
    if (digest.status !== DIGEST_STATUSES.READY || !digest.content) {
      throw ORPCBadRequestError(errorCodes.DIGEST_NOT_READY);
    }
    const revisions = await this.revisionRepository.listForDigest(digestId);
    const current = findPart(applyRevisions(digest.content, revisions), ref);
    if (!current) throw ORPCNotFoundError(errorCodes.DIGEST_PART_NOT_FOUND);
    const isRunning = revisions.some(
      (revision) =>
        revision.status === DIGEST_STATUSES.RUNNING && isSamePart(revision, ref) && this.runs.has(revision.id),
    );
    if (isRunning) throw ORPCBadRequestError(errorCodes.DIGEST_REVISION_RUNNING);
    const { snapshot, target } = await this.reviewsService.getContext(digest.snapshotId);
    const agent = await this.agentAdaptersService.pickedAgent();

    const revision = await this.revisionRepository.create({
      digestId,
      part: ref.part,
      partId: ref.partId,
      instructions,
      runner: agent.runner,
      model: agent.model,
    });
    this.runs.start(
      revision.id,
      async (signal) =>
        this.write({ revisionId: revision.id, digest, snapshot, target, current, instructions }, agent, signal),
      {
        timeoutMs: REVISION_TIMEOUT_MS,
        timeoutMessage: 'Rewriting took too long and was stopped',
        onError: (error) => this.logger.error('Rewrite failed', { revisionId: revision.id, error: String(error) }),
      },
    );
    return this.digestsService.respond(digest);
  }

  public async cancel(revisionId: string) {
    const revision = await this.revisionRepository.findById(revisionId);
    if (!revision) throw ORPCNotFoundError(errorCodes.DIGEST_REVISION_NOT_FOUND);
    if (revision.status === DIGEST_STATUSES.RUNNING) {
      await this.revisionRepository.update(revisionId, {
        status: DIGEST_STATUSES.CANCELLED,
        progress: null,
        finishedAt: new Date(),
      });
      this.runs.abort(revisionId, 'Stopped');
    }
    return this.digestsService.respond(await this.getDigest(revision.digestId));
  }

  /** Shows a ready version of the part, or the digest's own when `revisionId` is left out. */
  public async select(digestId: string, ref: iDigestPartRef, revisionId: string | undefined) {
    const digest = await this.getDigest(digestId);
    if (revisionId) {
      const revision = await this.revisionRepository.findById(revisionId);
      const isUsable =
        revision?.digestId === digestId && revision.status === DIGEST_STATUSES.READY && isSamePart(revision, ref);
      if (!isUsable) throw ORPCNotFoundError(errorCodes.DIGEST_REVISION_NOT_FOUND);
    }
    await this.revisionRepository.select(digestId, ref, revisionId);
    return this.digestsService.respond(digest);
  }

  /** Called once at startup: nothing can still be rewriting from an earlier launch. */
  public async failInterrupted() {
    await this.revisionRepository.failRunning('Chaff closed while the part was being rewritten');
  }

  public stopAll() {
    this.runs.stopAll();
  }

  private async write(run: iRevisionRun, agent: iPickedAgent, signal: AbortSignal) {
    const progress = createLatestThrottle((text: string) => {
      this.revisionRepository.update(run.revisionId, { progress: text }).catch(() => undefined);
    }, REVISION_PROGRESS_INTERVAL_MS);
    try {
      progress.push('Checking out the snapshot');
      await this.agentCheckoutService.withCheckout(
        run.target.workspaceId,
        run.snapshot,
        { directory: REVISIONS_DIRECTORY, runId: run.revisionId },
        async (checkout) => {
          const [units, files] = await Promise.all([
            this.snapshotRepository.listUnits(run.snapshot.id),
            this.snapshotRepository.listFiles(run.snapshot.id),
          ]);
          const promptUnits = toPromptUnits(units, files);
          const prompt = buildRevisionPrompt({
            branch: run.target.branch,
            parentBranch: run.snapshot.parentBranch,
            baseSha: run.snapshot.baseSha,
            headSha: run.snapshot.headSha,
            units: promptUnits,
            diffDirectory: checkout.diffDirectory,
            patch: this.partPatch(run.current, checkout, promptUnits),
            current: run.current,
            instructions: run.instructions,
          });
          progress.push(`Starting ${DIGEST_RUNNER_LABELS.get(agent.runner)}`);
          const answer = await agent.adapter.run(agent.command, {
            cwd: checkout.checkout,
            scratchDir: checkout.scratchDir,
            diffDirectory: checkout.diffDirectory,
            prompt,
            model: agent.model,
            schema: AGENT_REVISION_JSON_SCHEMAS.get(run.current.part),
            signal,
            onProgress: progress.push,
          });
          const content = await checkRevisedPart(run.current, answer, shortIdsOf(promptUnits), checkout.checkout);
          if (!content) throw new Error('The agent did not answer with a usable rewrite');
          progress.stop();
          const latest = await this.revisionRepository.findById(run.revisionId);
          if (latest?.status === DIGEST_STATUSES.RUNNING) await this.revisionRepository.finish(run.revisionId, content);
        },
      );
    } catch (error) {
      progress.stop();
      // A cancelled rewrite is already marked; anything else that stops the run is a failure.
      const latest = await this.revisionRepository.findById(run.revisionId);
      if (latest?.status === DIGEST_STATUSES.RUNNING) {
        await this.revisionRepository.update(run.revisionId, {
          status: DIGEST_STATUSES.FAILED,
          error: agentFailureMessage(error, signal),
          progress: null,
          finishedAt: new Date(),
        });
      }
      throw error;
    }
  }

  /** The diff of the files the part is about: the whole branch for the overview, cut to fit the prompt. */
  private partPatch(current: iRevisedPart, { patch }: iAgentCheckout, units: readonly iPromptUnit[]) {
    if ('overview' in current) return fitPatch(patch, MAX_REVISION_PATCH_CHARS).patch;
    const unitIds = 'note' in current ? [current.note.unitId] : current.diagram.unitIds;
    const paths = new Set(units.filter((unit) => unitIds.includes(unit.unitId)).map((unit) => unit.path));
    const files = splitPatch(patch).filter((file) => paths.has(file.path));
    return fitPatch(files.map((file) => file.text).join(''), MAX_REVISION_PATCH_CHARS).patch;
  }

  private async getDigest(digestId: string) {
    const digest = await this.digestRepository.findById(digestId);
    if (!digest) throw ORPCNotFoundError(errorCodes.DIGEST_NOT_FOUND);
    return digest;
  }
}
