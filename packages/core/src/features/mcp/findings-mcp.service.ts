import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ORPCError } from '@orpc/server';
import { inject, singleton } from 'tsyringe';
import z from 'zod';

import { agentReportStatusesEnumwaii } from '@chaff/common/enums/export.enums';
import type { AgentReportStatus } from '@chaff/common/enums/export.enums';
import {
  FINDING_AUTHORS,
  FINDING_STATUS_LABELS,
  FINDING_STATUSES,
  IS_ACTIVE_FINDING_STATUS,
  findingStatusSchema,
} from '@chaff/common/enums/review.enums';
import { findingsImportFileSchema } from '@chaff/server-contract/contract/findings.contract';

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN, SNAPSHOT_REPOSITORY_TOKEN } from '@~/di/tokens';
import { reportedNumber, reportedTargetStatus } from '@~/features/findings/agent-report.utils';
import { FindingsImportService } from '@~/features/findings/findings-import.service';
import { FindingsService } from '@~/features/findings/findings.service';
import type { iFindingsImportFile } from '@~/features/findings/findings.types';
import { ReviewsService } from '@~/features/reviews/reviews.service';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { SettingsService } from '@~/features/settings/settings.service';

import { AgentAccessError } from './agent-access.error';
import { formatStartedReview, formatWrittenFindings } from './agent-reviews-format.utils';
import { AgentReviewsService } from './agent-reviews.service';
import { AgentScopeService } from './agent-scope.service';
import { formatFindingsForAgent } from './findings-for-agent.utils';
import { AGENT_INSTRUCTIONS, SERVER_NAME } from './mcp.constants';
import { CHAFF_TOOLS } from './mcp.enums';
import type { iAgentPlace, iAgentSession, iStartReviewArguments } from './mcp.types';

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_COMMITS = 100;
const MAX_AUTHOR_LENGTH = 120;
const DEFAULT_AGENT_NAME = 'A coding agent';

const placeShape = {
  repo: z.string().max(4096).optional().describe('Path of the repository, when you are not working inside it.'),
  branch: z.string().max(255).optional().describe('Branch whose review to use; defaults to the checked-out branch.'),
};

const findingsShape = {
  ...placeShape,
  includeResolved: z
    .boolean()
    .optional()
    .describe('Also list verified and closed findings, to reopen one that is still wrong.'),
};

const replyShape = {
  ...placeShape,
  finding: z.string().min(1).max(32).describe('The finding, as F-12 or 12.'),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH).describe('What you did, your answer, or your question.'),
  status: z
    .literal(agentReportStatusesEnumwaii.rawValues)
    .transform((value) => agentReportStatusesEnumwaii.parse(value))
    .optional()
    .describe(
      'fix_proposed for a concern you fixed, answered for a question, reopened for a finding still wrong; leave out to only reply.',
    ),
  commits: z.array(z.string().min(1).max(64)).max(MAX_COMMITS).optional().describe('Commits of a proposed fix.'),
};

const startReviewShape = {
  review: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .describe('A merge or pull request link, !412 or #412, or a branch name, as in the start box on Overview.'),
  repo: z
    .string()
    .max(4096)
    .optional()
    .describe(
      "Path of the repository's clone. Defaults to the repository linked to the link's project, else the folder you work in. Chaff adds it when it does not have it.",
    ),
  parentBranch: z
    .string()
    .max(255)
    .optional()
    .describe(
      'For a branch in no stack in Chaff: the branch it merges into. Chaff puts it in a stack onto that branch.',
    ),
};

const writeFindingsShape = {
  ...placeShape,
  snapshot: z
    .string()
    .max(64)
    .optional()
    .describe("Snapshot id from chaff_start_review; defaults to the newest snapshot of repo and branch's review."),
  headSha: findingsImportFileSchema.shape.headSha.describe(
    'The commit your line numbers refer to; Chaff refuses the findings when it is not the head of the snapshot.',
  ),
  findings: findingsImportFileSchema.shape.findings.describe(
    'Each with a stable id (sending the same id again changes nothing), a kind, a severity for concerns, a Markdown body, and anchors: path, side (NEW unless the lines were removed), startLine and endLine on that side. No anchors for the whole branch.',
  ),
  author: z
    .string()
    .trim()
    .min(1)
    .max(MAX_AUTHOR_LENGTH)
    .optional()
    .describe(
      'How Chaff names you on the findings, such as "Claude Code, review of ABC-123"; defaults to your client name.',
    ),
};

interface iWriteFindingsArguments extends iAgentPlace, iFindingsImportFile {
  snapshot?: string;
  author?: string;
}

interface iReplyArguments extends iAgentPlace {
  finding: string;
  message: string;
  status?: AgentReportStatus;
  commits?: string[];
}

/**
 * The MCP server one coding agent talks to: it reads the findings of its branch and answers on them, and it can
 * start reviews and write its own findings into them for the reviewer.
 */
@singleton()
export class FindingsMcpService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    @inject(SNAPSHOT_REPOSITORY_TOKEN) private readonly snapshotRepository: iSnapshotRepository,
    private readonly agentScopeService: AgentScopeService,
    private readonly agentReviewsService: AgentReviewsService,
    private readonly findingsService: FindingsService,
    private readonly findingsImportService: FindingsImportService,
    private readonly reviewsService: ReviewsService,
    private readonly settingsService: SettingsService,
  ) {}

  /** A server for one agent's session. */
  public createServer(session: iAgentSession) {
    const server = new McpServer(
      { name: SERVER_NAME, version: this.options.appVersion },
      { instructions: AGENT_INSTRUCTIONS },
    );
    server.registerTool(
      CHAFF_TOOLS.chaff_findings,
      {
        title: 'Read review findings',
        description:
          "The reviewer's findings on the branch you work on, from Chaff: each one's comment, the code as reviewed and where it is now, and its discussion. Open findings by default.",
        inputSchema: findingsShape,
        annotations: { readOnlyHint: true },
      },
      async (input) => this.answer(async () => this.listFindings({ ...session, ...input })),
    );
    server.registerTool(
      CHAFF_TOOLS.chaff_reply,
      {
        title: 'Reply on a finding',
        description:
          'Answers on a finding in Chaff: a message, optionally moving it to fix_proposed, answered or reopened. Only the reviewer verifies or closes findings.',
        inputSchema: replyShape,
      },
      async (input) => this.answer(async () => this.reply({ ...session, ...input })),
    );
    server.registerTool(
      CHAFF_TOOLS.chaff_start_review,
      {
        title: 'Start a review',
        description:
          'Starts a review in Chaff, or continues the one that exists, from a merge or pull request link, !412 / #412, or a branch name. Chaff copies the change into its store and freezes a snapshot; your repository is only read. Returns the snapshot to write findings on.',
        inputSchema: startReviewShape,
        annotations: { idempotentHint: true },
      },
      async (input) => this.answer(async () => this.startReview({ ...session, ...input })),
    );
    server.registerTool(
      CHAFF_TOOLS.chaff_write_findings,
      {
        title: 'Write review findings',
        description:
          "Writes your code review findings into a review in Chaff, marked as yours, for the reviewer to keep or discard. Anchors are placed by path and lines on the snapshot's diff; anchors outside it are left out and listed, never moved. Findings whose id the review already has are skipped.",
        inputSchema: writeFindingsShape,
        annotations: { idempotentHint: true },
      },
      async (input) =>
        this.answer(async () =>
          this.writeFindings({ ...session, ...input }, server.server.getClientVersion()?.name ?? DEFAULT_AGENT_NAME),
        ),
    );
    return server;
  }

  private async listFindings({ includeResolved = false, ...place }: iAgentPlace & { includeResolved?: boolean }) {
    await this.checkAccess();
    const scope = await this.agentScopeService.resolve(place);
    const findings = await this.findingsService.list({ targetId: scope.target.id });
    const shown = findings.filter(
      (finding) =>
        finding.status !== FINDING_STATUSES.WITHDRAWN &&
        (includeResolved || IS_ACTIVE_FINDING_STATUS.get(finding.status)),
    );
    return formatFindingsForAgent(scope, shown);
  }

  private async reply({ finding, message, status, commits, ...place }: iReplyArguments) {
    await this.checkAccess();
    const scope = await this.agentScopeService.resolve(place);
    const number = reportedNumber(finding);
    const record = (await this.findingsService.list({ workspaceId: scope.workspace.id })).find(
      (candidate) => candidate.number === number,
    );
    if (!record) throw new AgentAccessError(`There is no finding ${finding} in ${scope.workspace.name}.`);
    const updated = await this.findingsService.reply(record.id, {
      author: FINDING_AUTHORS.AGENT,
      body: message,
      status: status ? reportedTargetStatus(status) : undefined,
      commits,
    });
    return `Replied on F-${updated.number}; it is ${FINDING_STATUS_LABELS.get(updated.status).toLowerCase()}.`;
  }

  private async startReview(input: iStartReviewArguments) {
    await this.checkAccess();
    return formatStartedReview(await this.agentReviewsService.start(input));
  }

  private async writeFindings(
    { snapshot, headSha, findings, author, ...place }: iWriteFindingsArguments,
    clientName: string,
  ) {
    await this.checkAccess();
    const snapshotId = snapshot ?? (await this.newestSnapshotId(place));
    const result = await this.findingsImportService.import(
      snapshotId,
      { headSha, findings },
      { author: FINDING_AUTHORS.AGENT, authorName: author ?? clientName },
    );
    const { target } = await this.reviewsService.getContext(snapshotId);
    return formatWrittenFindings(target, result);
  }

  private async newestSnapshotId(place: iAgentPlace) {
    const scope = await this.agentScopeService.resolve(place);
    const latest = await this.snapshotRepository.findLatest(scope.target.id);
    if (!latest) throw new AgentAccessError(`The review of ${scope.branch} has no snapshot yet. Open it in Chaff.`);
    return latest.id;
  }

  private async checkAccess() {
    const { isAgentAccessEnabled } = await this.settingsService.get();
    if (!isAgentAccessEnabled) {
      throw new AgentAccessError('Agent access is off in Chaff. Turn it on in Settings, under Agent access.');
    }
  }

  /** The tool's text, or what went wrong as the agent should read it. */
  private async answer(run: () => Promise<string>): Promise<CallToolResult> {
    try {
      return { content: [{ type: 'text', text: await run() }] };
    } catch (error) {
      return { content: [{ type: 'text', text: this.describeFailure(error) }], isError: true };
    }
  }

  private describeFailure(error: unknown) {
    if (error instanceof AgentAccessError) return error.message;
    if (error instanceof ORPCError) {
      const data = z
        .object({ finding: z.string(), from: findingStatusSchema, to: findingStatusSchema })
        .safeParse(error.data);
      if (data.success) {
        const { finding, from, to } = data.data;
        return `${finding} cannot move from ${FINDING_STATUS_LABELS.get(from)} to ${FINDING_STATUS_LABELS.get(to)}. Agents may propose a fix for an open concern, answer an open question, or reopen a finding that was fixed, verified, answered or closed.`;
      }
      const heads = z.object({ fileHead: z.string(), snapshotHead: z.string() }).safeParse(error.data);
      if (heads.success) {
        return `${error.message}: the findings are for ${heads.data.fileHead}, the snapshot is at ${heads.data.snapshotHead}. Start or update the review in Chaff, or send line numbers for the snapshot's head.`;
      }
      return error.message;
    }
    return 'Chaff could not do that. Check the Chaff log for details.';
  }
}
