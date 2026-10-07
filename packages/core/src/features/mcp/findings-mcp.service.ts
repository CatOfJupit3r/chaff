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

import type { iCoreOptions } from '@~/core.types';
import { CORE_OPTIONS_TOKEN } from '@~/di/tokens';
import { reportedNumber, reportedTargetStatus } from '@~/features/findings/agent-report.utils';
import { FindingsService } from '@~/features/findings/findings.service';
import { SettingsService } from '@~/features/settings/settings.service';

import { AgentAccessError } from './agent-access.error';
import { AgentScopeService } from './agent-scope.service';
import { formatFindingsForAgent } from './findings-for-agent.utils';
import { AGENT_INSTRUCTIONS, SERVER_NAME } from './mcp.constants';
import type { iAgentPlace } from './mcp.types';

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_COMMITS = 100;

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

interface iReplyArguments extends iAgentPlace {
  finding: string;
  message: string;
  status?: AgentReportStatus;
  commits?: string[];
}

/** The MCP server one coding agent talks to: it reads the findings of its branch and answers on them. */
@singleton()
export class FindingsMcpService {
  constructor(
    @inject(CORE_OPTIONS_TOKEN) private readonly options: iCoreOptions,
    private readonly agentScopeService: AgentScopeService,
    private readonly findingsService: FindingsService,
    private readonly settingsService: SettingsService,
  ) {}

  /** A server for an agent running in the folder. */
  public createServer(folder: string) {
    const server = new McpServer(
      { name: SERVER_NAME, version: this.options.appVersion },
      { instructions: AGENT_INSTRUCTIONS },
    );
    server.registerTool(
      'chaff_findings',
      {
        title: 'Read review findings',
        description:
          "The reviewer's findings on the branch you work on, from Chaff: each one's comment, the code as reviewed and where it is now, and its discussion. Open findings by default.",
        inputSchema: findingsShape,
        annotations: { readOnlyHint: true },
      },
      async (input) => this.answer(async () => this.listFindings({ folder, ...input })),
    );
    server.registerTool(
      'chaff_reply',
      {
        title: 'Reply on a finding',
        description:
          'Answers on a finding in Chaff: a message, optionally moving it to fix_proposed, answered or reopened. Only the reviewer verifies or closes findings.',
        inputSchema: replyShape,
      },
      async (input) => this.answer(async () => this.reply({ folder, ...input })),
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
      return error.message;
    }
    return 'Chaff could not do that. Check the Chaff log for details.';
  }
}
