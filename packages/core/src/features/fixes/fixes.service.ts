import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { inject, singleton } from 'tsyringe';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { errorCodes } from '@chaff/common/enums/errors.enums';
import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import { FIX_STATUSES } from '@chaff/common/enums/fix.enums';
import { FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';

import type { iCoreOptions } from '@~/core.types';
import {
  CORE_OPTIONS_TOKEN,
  FINDING_REPOSITORY_TOKEN,
  FIX_REPOSITORY_TOKEN,
  SNAPSHOT_REPOSITORY_TOKEN,
} from '@~/di/tokens';
import { AgentCommandsService } from '@~/features/agents/agent-commands.service';
import { ExportsService } from '@~/features/exports/exports.service';
import { agentPrompt, packetMarkdown } from '@~/features/exports/packet-format.utils';
import { AgentReportService } from '@~/features/findings/agent-report.service';
import { parseAgentReport, reportedNumber } from '@~/features/findings/agent-report.utils';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import { SnapshotStoreService } from '@~/features/reviews/snapshots/snapshot-store.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { WorkspacesService } from '@~/features/workspaces/workspaces.service';
import { ORPCBadRequestError, ORPCNotFoundError, ORPCUnprocessableContentError } from '@~/lib/orpc-error-wrapper';

import { ClaudeCodeFixAdapter } from './claude-code-fix.adapter';
import { CodexFixAdapter } from './codex-fix.adapter';
import { buildFixPrompt } from './fix-prompt.utils';
import type { iFixRepository } from './fix.repository';
import type { iFixRecord, iFixReport, iFixRunnerAdapter, iFixUpdate } from './fixes.types';

const FIXES_DIRECTORY = 'fixes';
/** A fix that takes longer than this is stopped. */
const FIX_TIMEOUT_MS = 30 * 60 * 1000;
const PROGRESS_INTERVAL_MS = 400;
const MAX_SUMMARY_CHARS = 20_000;

/** Findings an agent can act on: open concerns to fix and open questions to answer. */
const FIXABLE_KINDS = new Set<FindingKind>([FINDING_KINDS.CONCERN, FINDING_KINDS.QUESTION]);
const FIXABLE_STATUSES: FindingStatus[] = [FINDING_STATUSES.OPEN, FINDING_STATUSES.REOPENED];

interface iFixJob {
  fix: iFixRecord;
  workspaceId: string;
  command: string;
  prompt: string;
  folder: string;
  numbers: number[];
}

function ending(failure: unknown): iFixUpdate {
  if (failure === undefined) return { status: FIX_STATUSES.DONE, error: null, finishedAt: new Date() };
  const error = failure instanceof Error ? failure.message : String(failure);
  return { status: FIX_STATUSES.FAILED, error, finishedAt: new Date() };
}

const quote = (value: string) => `"${value.replaceAll('"', '\\"')}"`;

/**
 * Fix hand-off: on the reviewer's explicit request, a coding agent with write access works on a review's
 * open findings in a new checkout of the newest snapshot, on a new branch of Chaff's store. Chaff commits
 * what it changed and reads its report. The user's repository and branch are never written; the user
 * brings the fix over with the fetch command if they want it.
 */
@singleton()
export class FixesService {
  private readonly running = new Map<string, AbortController>();

  private readonly logger;

  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    @inject(FIX_REPOSITORY_TOKEN) private readonly fixRepository: iFixRepository,
    @inject(FINDING_REPOSITORY_TOKEN) private readonly findingRepository: iFindingRepository,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly reviewsService: ReviewsService,
    private readonly workspacesService: WorkspacesService,
    private readonly snapshotStoreService: SnapshotStoreService,
    private readonly exportsService: ExportsService,
    private readonly agentReportService: AgentReportService,
    private readonly agentCommandsService: AgentCommandsService,
    private readonly claudeCodeFixAdapter: ClaudeCodeFixAdapter,
    private readonly codexFixAdapter: CodexFixAdapter,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create('fixes');
  }

  public async list(snapshotId: string) {
    const { target } = await this.reviewsService.getContext(snapshotId);
    const fixes = await this.fixRepository.listByTarget(target.id);
    return this.toResponses(target.workspaceId, fixes);
  }

  public async start(input: { snapshotId: string; runner: DigestRunner; findingIds?: string[] }) {
    const { target } = await this.reviewsService.getContext(input.snapshotId);
    const fixes = await this.fixRepository.listByTarget(target.id);
    if (fixes.some((fix) => fix.status === FIX_STATUSES.RUNNING && this.running.has(fix.id))) {
      throw ORPCBadRequestError(errorCodes.FIX_ALREADY_RUNNING);
    }
    const snapshot = await this.snapshotRepository.findLatest(target.id);
    if (!snapshot) throw ORPCNotFoundError(errorCodes.SNAPSHOT_NOT_FOUND);

    const wanted = input.findingIds ? new Set(input.findingIds) : undefined;
    const findings = (await this.findingRepository.list({ targetId: target.id }))
      .filter(
        (finding) =>
          FIXABLE_KINDS.has(finding.kind) &&
          FIXABLE_STATUSES.includes(finding.status) &&
          (!wanted || wanted.has(finding.id)),
      )
      .toSorted((left, right) => left.number - right.number);
    if (findings.length === 0) throw ORPCUnprocessableContentError(errorCodes.NOTHING_TO_FIX);
    const command = await this.agentCommandsService.resolve(input.runner);

    const packet = await this.exportsService.build({
      snapshotId: snapshot.id,
      scope: EXPORT_SCOPES.review,
      statuses: FIXABLE_STATUSES,
      shouldQuoteCode: true,
      shouldListUnreviewed: false,
      findingIds: findings.map((finding) => finding.id),
    });
    const prompt = buildFixPrompt({
      branch: target.branch,
      headSha: snapshot.headSha,
      agentPrompt: agentPrompt(packet, packetMarkdown(packet, { shouldQuoteCode: true })),
    });

    const id = randomUUID();
    const fix = await this.fixRepository.create({
      id,
      targetId: target.id,
      snapshotId: snapshot.id,
      runner: input.runner,
      branch: `chaff/fix-${id.slice(0, 8)}`,
      baseSha: snapshot.headSha,
      findingIds: findings.map((finding) => finding.id),
      progress: 'Checking out the snapshot',
    });
    this.launch({
      fix,
      workspaceId: target.workspaceId,
      command,
      prompt,
      folder: path.join(this.options.dataDir, FIXES_DIRECTORY, fix.id),
      numbers: findings.map((finding) => finding.number),
    });
    const [response] = await this.toResponses(target.workspaceId, [fix]);
    return response;
  }

  public async cancel(fixId: string) {
    const fix = await this.getRecord(fixId);
    if (fix.status === FIX_STATUSES.RUNNING) {
      await this.fixRepository.update(fixId, {
        status: FIX_STATUSES.CANCELLED,
        progress: null,
        finishedAt: new Date(),
      });
      this.running.get(fixId)?.abort(new Error('Stopped'));
    }
    return this.response(fixId);
  }

  public async discard(fixId: string) {
    const fix = await this.getRecord(fixId);
    if (fix.status === FIX_STATUSES.RUNNING && this.running.has(fixId)) {
      throw ORPCBadRequestError(errorCodes.FIX_STILL_RUNNING);
    }
    const workspaceId = await this.workspaceOf(fix);
    const folder = path.join(this.options.dataDir, FIXES_DIRECTORY, fix.id);
    await this.snapshotStoreService.removeWorktree(workspaceId, path.join(folder, 'checkout'));
    await this.snapshotStoreService.deleteBranch(workspaceId, fix.branch);
    await rm(folder, { recursive: true, force: true });
    await this.fixRepository.remove(fixId);
    return { fixId };
  }

  public async patch(fixId: string) {
    const fix = await this.getRecord(fixId);
    const workspaceId = await this.workspaceOf(fix);
    if (!fix.headSha || fix.headSha === fix.baseSha) return { patch: '' };
    return { patch: await this.snapshotStoreService.patch(workspaceId, fix.baseSha, fix.headSha) };
  }

  /** Called once at startup: nothing can still be running from an earlier launch. */
  public async failInterrupted() {
    await this.fixRepository.failRunning('Chaff closed while the agent was working');
  }

  /** Stops every running agent; used when the app quits. */
  public stopAll() {
    for (const controller of this.running.values()) controller.abort(new Error('Chaff is closing'));
  }

  private launch(job: iFixJob) {
    const controller = new AbortController();
    this.running.set(job.fix.id, controller);
    const timeout = setTimeout(
      () => controller.abort(new Error('The agent took too long and was stopped')),
      FIX_TIMEOUT_MS,
    );
    this.run(job, controller.signal)
      .catch((error: unknown) => this.logger.error('Fix failed', { fixId: job.fix.id, error: String(error) }))
      .finally(() => {
        clearTimeout(timeout);
        this.running.delete(job.fix.id);
      });
  }

  private adapterFor(runner: DigestRunner): iFixRunnerAdapter {
    return runner === DIGEST_RUNNERS.CODEX ? this.codexFixAdapter : this.claudeCodeFixAdapter;
  }

  private async run({ fix, workspaceId, command, prompt, folder, numbers }: iFixJob, signal: AbortSignal) {
    const checkout = path.join(folder, 'checkout');
    const scratchDir = path.join(folder, 'scratch');
    let lastProgressAt = 0;
    const onProgress = (progress: string) => {
      const now = Date.now();
      if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;
      lastProgressAt = now;
      this.fixRepository.update(fix.id, { progress }).catch(() => undefined);
    };

    let summary: string | undefined;
    let failure: unknown;
    try {
      await mkdir(scratchDir, { recursive: true });
      await this.snapshotStoreService.addBranchWorktree(workspaceId, fix.branch, fix.baseSha, checkout);
      onProgress(`Starting ${DIGEST_RUNNER_LABELS.get(fix.runner)}`);
      summary = await this.adapterFor(fix.runner).run(command, {
        cwd: checkout,
        scratchDir,
        prompt,
        signal,
        onProgress,
      });
    } catch (error) {
      failure = signal.aborted ? signal.reason : error;
    }

    let outcome: iFixUpdate = {};
    try {
      const labels = numbers.map((number) => `F-${number}`).join(', ');
      const headSha = await this.snapshotStoreService.commitAll(
        checkout,
        `Address review findings ${labels}\n\nWritten by ${DIGEST_RUNNER_LABELS.get(fix.runner)} in a Chaff fix hand-off.`,
      );
      outcome = {
        headSha,
        files: await this.snapshotStoreService.diffStat(workspaceId, fix.baseSha, headSha),
        report:
          summary === undefined
            ? undefined
            : await this.applyReport(workspaceId, summary, numbers, headSha, fix.baseSha),
      };
    } catch (error) {
      failure ??= error;
    } finally {
      await rm(scratchDir, { recursive: true, force: true }).catch(() => undefined);
    }

    // A stopped fix is already marked; anything else ends it as done or failed.
    const current = await this.fixRepository.findById(fix.id);
    await this.fixRepository.update(fix.id, {
      ...outcome,
      summary: summary?.slice(0, MAX_SUMMARY_CHARS) ?? null,
      progress: null,
      ...(current?.status === FIX_STATUSES.RUNNING ? ending(failure) : {}),
    });
  }

  /** Applies the agent's report to the findings it was handed; ids of any other finding are listed, not applied. */
  private async applyReport(
    workspaceId: string,
    summary: string,
    numbers: number[],
    headSha: string,
    baseSha: string,
  ): Promise<iFixReport | undefined> {
    const items = parseAgentReport(summary);
    if (!items) return undefined;
    const handed = new Set(numbers);
    const isHanded = (id: string | number) => handed.has(reportedNumber(id) ?? -1);
    const result = await this.agentReportService.apply(
      workspaceId,
      items.filter((item) => isHanded(item.id)),
      headSha === baseSha ? undefined : [headSha],
    );
    const others = items.filter((item) => !isHanded(item.id)).map((item) => String(item.id));
    return { ...result, unknown: [...result.unknown, ...others] };
  }

  private async workspaceOf(fix: iFixRecord) {
    const { target } = await this.reviewsService.getTargetContext(fix.targetId);
    return target.workspaceId;
  }

  private async getRecord(fixId: string) {
    const fix = await this.fixRepository.findById(fixId);
    if (!fix) throw ORPCNotFoundError(errorCodes.FIX_NOT_FOUND);
    return fix;
  }

  private async response(fixId: string) {
    const fix = await this.getRecord(fixId);
    const workspaceId = await this.workspaceOf(fix);
    const [response] = await this.toResponses(workspaceId, [fix]);
    return response;
  }

  private async toResponses(workspaceId: string, fixes: iFixRecord[]) {
    if (fixes.length === 0) return [];
    const workspace = await this.workspacesService.getRecord(workspaceId);
    const numbers = new Map(
      (await this.findingRepository.list({ workspaceId })).map((finding) => [finding.id, finding.number]),
    );
    const storePath = this.snapshotStoreService.storePath(workspaceId);
    return fixes.map((fix) => ({
      ...fix,
      findingNumbers: fix.findingIds.flatMap((findingId) => {
        const number = numbers.get(findingId);
        return number === undefined ? [] : [number];
      }),
      checkoutPath: path.join(this.options.dataDir, FIXES_DIRECTORY, fix.id, 'checkout'),
      fetchCommand: `git -C ${quote(workspace.repoPath)} fetch ${quote(storePath)} ${fix.branch}:${fix.branch}`,
    }));
  }
}
