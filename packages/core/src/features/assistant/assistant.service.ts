import { inject, singleton } from 'tsyringe';

import { ANSWER_STATUSES } from '@chaff/common/enums/assistant.enums';
import { DIGEST_RUNNER_LABELS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';

import { ASSISTANT_EXCHANGE_REPOSITORY_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { AgentAdaptersService } from '@~/features/agents/agent-adapters.service';
import { AgentCheckoutService } from '@~/features/agents/agent-checkout.service';
import { agentFailureMessage } from '@~/features/agents/agent-failure.utils';
import { AgentRuns } from '@~/features/agents/agent-runs';
import type { iAgentCheckout, iPickedAgent } from '@~/features/agents/agents.types';
import { createLatestThrottle } from '@~/features/agents/latest-throttle.utils';
import { fitPatch, splitPatch } from '@~/features/digests/digest-patch.utils';
import { toPromptUnits } from '@~/features/digests/digest-prompt-units.utils';
import { DigestsService } from '@~/features/digests/digests.service';
import type { iPromptUnit } from '@~/features/digests/digests.types';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { AgentRunServerService } from '@~/features/mcp/agent-run-server.service';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import type { iSnapshotRecord } from '@~/features/reviews/snapshots/snapshots.types';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import type { iAssistantExchangeRepository } from './assistant-exchange.repository';
import { AGENT_ANSWER_JSON_SCHEMA, agentAnswerSchema, partialAnswerOf } from './assistant-output.schema';
import { buildAnswerPrompt } from './assistant-prompt.utils';
import {
  ANSWER_TIMEOUT_MS,
  ANSWER_WRITE_INTERVAL_MS,
  ANSWERS_DIRECTORY,
  MAX_ANSWER_PATCH_CHARS,
} from './assistant.constants';
import type { iAssistantExchangeRecord, iAssistantQuestion } from './assistant.types';

interface iAnswerRun {
  exchangeId: string;
  question: iAssistantQuestion;
  snapshot: iSnapshotRecord;
  target: iReviewTargetRecord;
  /** The questions answered on the card before this one. */
  earlier: iAssistantExchangeRecord[];
}

/**
 * Questions about one Focus card, answered while the reviewer reads it: the coding agent picked in Settings
 * reads a read-only checkout of the snapshot, the card's diff, the digest and the conversation so far.
 */
@singleton()
export class AssistantService {
  private readonly runs = new AgentRuns();

  private readonly logger;

  constructor(
    @inject(ASSISTANT_EXCHANGE_REPOSITORY_TOKEN) private readonly exchangeRepository: iAssistantExchangeRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
    private readonly digestsService: DigestsService,
    private readonly agentAdaptersService: AgentAdaptersService,
    private readonly agentCheckoutService: AgentCheckoutService,
    private readonly agentRunServerService: AgentRunServerService,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('assistant');
  }

  public async thread(snapshotId: string, cardId: string) {
    await this.reviewsService.getContext(snapshotId);
    return this.exchangeRepository.listForCard(snapshotId, cardId);
  }

  public async ask(question: iAssistantQuestion) {
    const { snapshot, target } = await this.reviewsService.getContext(question.snapshotId);
    const units = await this.snapshotRepository.listUnits(question.snapshotId);
    if (question.unitIds.some((unitId) => !units.some((unit) => unit.id === unitId))) {
      throw ORPCNotFoundError(errorCodes.UNIT_NOT_FOUND);
    }
    const thread = await this.exchangeRepository.listForCard(question.snapshotId, question.cardId);
    const isBusy = thread.some((exchange) => exchange.status === ANSWER_STATUSES.WRITING && this.runs.has(exchange.id));
    if (isBusy) throw ORPCBadRequestError(errorCodes.ASSISTANT_BUSY);
    const agent = await this.agentAdaptersService.pickedAgent();

    const exchange = await this.exchangeRepository.create({
      snapshotId: question.snapshotId,
      cardId: question.cardId,
      question: question.question,
      runner: agent.runner,
      model: agent.model,
    });
    const earlier = thread.filter((candidate) => candidate.status === ANSWER_STATUSES.ANSWERED);
    this.runs.start(
      exchange.id,
      async (signal) => this.write({ exchangeId: exchange.id, question, snapshot, target, earlier }, agent, signal),
      {
        timeoutMs: ANSWER_TIMEOUT_MS,
        timeoutMessage: 'Answering took too long and was stopped',
        onError: (error) => this.logger.error('Answer failed', { exchangeId: exchange.id, error: String(error) }),
      },
    );
    return exchange;
  }

  /** Stops the agent, keeping what it wrote of the answer. */
  public async cancel(exchangeId: string) {
    const exchange = await this.getExchange(exchangeId);
    if (exchange.status !== ANSWER_STATUSES.WRITING) return exchange;
    const cancelled = await this.exchangeRepository.update(exchangeId, {
      status: ANSWER_STATUSES.CANCELLED,
      progress: null,
      answeredAt: new Date(),
    });
    this.runs.abort(exchangeId, 'Stopped');
    return cancelled ?? exchange;
  }

  public async remove(exchangeId: string) {
    const exchange = await this.getExchange(exchangeId);
    this.runs.abort(exchangeId, 'Deleted');
    await this.exchangeRepository.remove(exchangeId);
    return this.exchangeRepository.listForCard(exchange.snapshotId, exchange.cardId);
  }

  /** Called once at startup: nothing can still be answering from an earlier launch. */
  public async failInterrupted() {
    await this.exchangeRepository.failWriting('Chaff closed while the answer was being written');
  }

  public stopAll() {
    this.runs.stopAll();
  }

  private async write(run: iAnswerRun, agent: iPickedAgent, signal: AbortSignal) {
    const progress = createLatestThrottle((text: string) => {
      this.exchangeRepository.update(run.exchangeId, { progress: text }).catch(() => undefined);
    }, ANSWER_WRITE_INTERVAL_MS);
    const draft = createLatestThrottle((answer: string) => {
      if (signal.aborted) return;
      this.exchangeRepository.update(run.exchangeId, { answer }).catch(() => undefined);
    }, ANSWER_WRITE_INTERVAL_MS);
    const stopWriting = () => {
      progress.stop();
      draft.stop();
    };

    try {
      progress.push('Checking out the snapshot');
      await this.agentCheckoutService.withCheckout(
        run.target.workspaceId,
        run.snapshot,
        { directory: ANSWERS_DIRECTORY, runId: run.exchangeId },
        async (checkout) => {
          const chaffServer = await this.agentRunServerService.forReview(run.target.id);
          const prompt = await this.preparePrompt(run, checkout, chaffServer !== undefined);
          progress.push(`Starting ${DIGEST_RUNNER_LABELS.get(agent.runner)}`);
          const answer = await agent.adapter.run(agent.command, {
            cwd: checkout.checkout,
            scratchDir: checkout.scratchDir,
            diffDirectory: checkout.diffDirectory,
            prompt,
            model: agent.model,
            schema: AGENT_ANSWER_JSON_SCHEMA,
            chaffServer,
            signal,
            onProgress: progress.push,
            onPartialAnswer: (partial) => {
              const text = partialAnswerOf(partial);
              if (text) draft.push(text);
            },
          });
          stopWriting();
          const parsed = agentAnswerSchema.safeParse(answer);
          const text = parsed.success ? parsed.data.answer.trim() : '';
          if (!text) throw new Error('The agent did not answer');
          const latest = await this.exchangeRepository.findById(run.exchangeId);
          if (latest?.status !== ANSWER_STATUSES.WRITING) return;
          await this.exchangeRepository.update(run.exchangeId, {
            status: ANSWER_STATUSES.ANSWERED,
            answer: text,
            progress: null,
            answeredAt: new Date(),
          });
        },
      );
    } catch (error) {
      stopWriting();
      // A stopped answer is already marked, and a deleted one is gone; anything else is a failure.
      const latest = await this.exchangeRepository.findById(run.exchangeId);
      if (latest?.status === ANSWER_STATUSES.WRITING) {
        await this.exchangeRepository.update(run.exchangeId, {
          status: ANSWER_STATUSES.FAILED,
          error: agentFailureMessage(error, signal),
          progress: null,
          answeredAt: new Date(),
        });
      }
      throw error;
    }
  }

  private async preparePrompt(run: iAnswerRun, checkout: iAgentCheckout, hasChaffTools: boolean) {
    const [units, files, digest] = await Promise.all([
      this.snapshotRepository.listUnits(run.snapshot.id),
      this.snapshotRepository.listFiles(run.snapshot.id),
      this.digestsService.get(run.snapshot.id),
    ]);
    const cardUnits = toPromptUnits(units, files).filter((unit) => run.question.unitIds.includes(unit.unitId));
    return buildAnswerPrompt({
      branch: run.target.branch,
      parentBranch: run.snapshot.parentBranch,
      baseSha: run.snapshot.baseSha,
      headSha: run.snapshot.headSha,
      cardTitle: run.question.cardTitle,
      units: cardUnits,
      diffDirectory: checkout.diffDirectory,
      patch: this.cardPatch(checkout.patch, cardUnits),
      digest: digest?.status === DIGEST_STATUSES.READY ? digest.content : undefined,
      earlier: run.earlier,
      hasChaffTools,
      question: run.question.question,
    });
  }

  /** The diff of the files the card's units are in, cut to fit the prompt. */
  private cardPatch(patch: string, units: readonly iPromptUnit[]) {
    const paths = new Set(units.map((unit) => unit.path));
    const files = splitPatch(patch).filter((file) => paths.has(file.path));
    return fitPatch(files.map((file) => file.text).join(''), MAX_ANSWER_PATCH_CHARS).patch;
  }

  private async getExchange(exchangeId: string) {
    const exchange = await this.exchangeRepository.findById(exchangeId);
    if (!exchange) throw ORPCNotFoundError(errorCodes.ASSISTANT_EXCHANGE_NOT_FOUND);
    return exchange;
  }
}
