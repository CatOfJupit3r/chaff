import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { FINDING_TASK_STATES } from '@chaff/common/enums/review.enums';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN, FINDING_REPOSITORY_TOKEN } from '@~/di/tokens';
import { AgentCommandsService } from '@~/features/agents/agent-commands.service';
import { ClaudeCodeAdapter } from '@~/features/digests/claude-code.adapter';
import { CodexAdapter } from '@~/features/digests/codex.adapter';
import type { iDigestRunnerAdapter } from '@~/features/digests/digests.types';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { SettingsService } from '@~/features/settings/settings.service';
import { ORPCBadRequestError, ORPCNotFoundError } from '@~/lib/orpc-error-wrapper';

import { AGENT_TASK_JSON_SCHEMA, buildTaskPrompt, checkTask } from './finding-task.utils';
import type { iFindingRepository } from './finding.repository';
import type { iFindingTaskChange } from './findings.types';

const TASKS_DIRECTORY = 'tasks';
/** Writing a task that takes longer than this is stopped. */
const TASK_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Suggested tasks: the coding agent picked in Settings restates a finding as one task, read-only and
 * from the prompt alone, and the reviewer accepts it as written or edited, or discards it. The comment
 * itself is never touched.
 */
@singleton()
export class FindingTasksService {
  private readonly running = new Map<string, AbortController>();

  private readonly logger;

  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    private readonly agentCommandsService: AgentCommandsService,
    private readonly settingsService: SettingsService,
    private readonly claudeCodeAdapter: ClaudeCodeAdapter,
    private readonly codexAdapter: CodexAdapter,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('finding-tasks');
  }

  public async suggest(findingId: string) {
    await this.getFinding(findingId);
    if (this.running.has(findingId)) throw ORPCBadRequestError(errorCodes.FINDING_TASK_BUSY);
    const { digestRunner: runner } = await this.settingsService.get();
    const command = await this.agentCommandsService.resolve(runner);

    const controller = new AbortController();
    this.running.set(findingId, controller);
    const writing = await this.findingRepository.setTask(findingId, { state: FINDING_TASK_STATES.WRITING, runner });
    const timeout = setTimeout(
      () => controller.abort(new Error('Writing the task took too long and was stopped')),
      TASK_TIMEOUT_MS,
    );
    this.write(findingId, command, runner, controller.signal)
      .catch((error: unknown) => this.logger.error('Task failed', { findingId, error: String(error) }))
      .finally(() => {
        clearTimeout(timeout);
        this.running.delete(findingId);
      });
    return writing ?? this.getFinding(findingId);
  }

  /** Keeps the task as the reviewer left it: the agent's words, edited ones, or their own. */
  public async accept(findingId: string, task: string, verify: string | undefined) {
    const finding = await this.getFinding(findingId);
    if (finding.task?.state === FINDING_TASK_STATES.WRITING) throw ORPCBadRequestError(errorCodes.FINDING_TASK_BUSY);
    const accepted = await this.findingRepository.setTask(findingId, {
      state: FINDING_TASK_STATES.ACCEPTED,
      runner: finding.task?.runner ?? DIGEST_RUNNERS.CLAUDE_CODE,
      task,
      verify: verify === '' ? undefined : verify,
    });
    return accepted ?? finding;
  }

  /** Drops the task, stopping the agent if it is still writing it. */
  public async discard(findingId: string) {
    await this.getFinding(findingId);
    this.running.get(findingId)?.abort(new Error('Discarded'));
    await this.findingRepository.removeTask(findingId);
    return this.getFinding(findingId);
  }

  /** Called once at startup: nothing can still be writing from an earlier launch. */
  public async failInterrupted() {
    await this.findingRepository.failWritingTasks('Chaff closed while the task was being written');
  }

  public stopAll() {
    for (const controller of this.running.values()) controller.abort(new Error('Chaff is closing'));
  }

  private adapterFor(runner: DigestRunner): iDigestRunnerAdapter {
    return runner === DIGEST_RUNNERS.CODEX ? this.codexAdapter : this.claudeCodeAdapter;
  }

  private async write(findingId: string, command: string, runner: DigestRunner, signal: AbortSignal) {
    const folder = path.join(this.options.dataDir, TASKS_DIRECTORY, findingId);
    const cwd = path.join(folder, 'empty');
    const scratchDir = path.join(folder, 'scratch');
    try {
      await mkdir(cwd, { recursive: true });
      await mkdir(scratchDir, { recursive: true });
      const answer = await this.adapterFor(runner).run(command, {
        cwd,
        scratchDir,
        prompt: buildTaskPrompt(await this.getFinding(findingId)),
        schema: AGENT_TASK_JSON_SCHEMA,
        signal,
        onProgress: () => undefined,
      });
      const checked = checkTask(answer);
      if (!checked) throw new Error('The agent did not answer with a usable task');
      await this.storeIfStillWriting(findingId, { state: FINDING_TASK_STATES.PROPOSED, runner, ...checked });
    } catch (error) {
      const reason: unknown = signal.aborted ? signal.reason : error;
      await this.storeIfStillWriting(findingId, {
        state: FINDING_TASK_STATES.FAILED,
        runner,
        error: reason instanceof Error ? reason.message : String(reason),
      });
      throw error;
    } finally {
      await rm(folder, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** A task discarded or accepted meanwhile stays as the reviewer left it. */
  private async storeIfStillWriting(findingId: string, task: iFindingTaskChange) {
    const current = await this.findingRepository.findById(findingId);
    if (current?.task?.state === FINDING_TASK_STATES.WRITING) await this.findingRepository.setTask(findingId, task);
  }

  private async getFinding(findingId: string) {
    const finding = await this.findingRepository.findById(findingId);
    if (!finding) throw ORPCNotFoundError(errorCodes.FINDING_NOT_FOUND);
    return finding;
  }
}
