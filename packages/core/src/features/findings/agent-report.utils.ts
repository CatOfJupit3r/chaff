import { emToZodSchema } from 'enumwaii/zod';
import z from 'zod';

import {
  AGENT_REPORT_STATUSES,
  REPORT_SKIP_REASONS,
  agentReportStatusesEnumwaii,
} from '@chaff/common/enums/export.enums';
import type { ReportSkipReason } from '@chaff/common/enums/export.enums';
import { FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';
import { canAgentSetFindingStatus } from '@chaff/common/helpers/finding-transitions.helper';

const MAX_NOTE_LENGTH = 20_000;
const MAX_COMMITS = 100;

const reportItemSchema = z.object({
  id: z.union([z.string().trim().min(1).max(64), z.number().int().positive()]),
  status: z.string().trim().max(64),
  note: z.string().trim().max(MAX_NOTE_LENGTH).optional(),
  commits: z.array(z.string().trim().min(1).max(64)).max(MAX_COMMITS).optional(),
});

export type iReportItem = z.infer<typeof reportItemSchema>;

const FENCED_JSON = /```(?:json)?\s*\n([\s\S]*?)```/g;

/** The JSON in an agent's reply: the whole text, else the last fenced block, else the outermost brackets. */
function extractJson(text: string): unknown {
  const candidates = [
    text.trim(),
    ...[...text.matchAll(FENCED_JSON)].map((match) => match[1]?.trim() ?? '').toReversed(),
  ];
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Not this one; try the next candidate.
    }
  }
  return undefined;
}

/** A list of items, or an object holding one under `findings`, `items` or `report`, or a single item. */
function itemsOf(parsed: unknown): unknown[] | undefined {
  if (Array.isArray(parsed)) return parsed as unknown[];
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const record = parsed as Record<string, unknown>;
  const list = record.findings ?? record.items ?? record.report;
  if (Array.isArray(list)) return list as unknown[];
  return 'id' in record ? [record] : undefined;
}

/** The items of a coding agent's report, or undefined when the text holds no report Chaff can read. */
export function parseAgentReport(text: string) {
  const items = itemsOf(extractJson(text));
  if (!items) return undefined;
  const parsed = z.array(reportItemSchema).safeParse(items);
  return parsed.success ? parsed.data : undefined;
}

/** The finding number a report refers to: `F-12`, `F12`, `12` or 12. */
export function reportedNumber(id: string | number) {
  if (typeof id === 'number') return id;
  const match = /^#?(?:F-?)?(\d+)$/i.exec(id.trim());
  return match ? Number(match[1]) : undefined;
}

/** The finding kinds each reported status applies to, and the status it moves them to. */
const REPORTED_TARGETS = agentReportStatusesEnumwaii.derive<{ kinds: readonly FindingKind[]; status: FindingStatus }>()(
  [AGENT_REPORT_STATUSES.fix_proposed, { kinds: [FINDING_KINDS.CONCERN], status: FINDING_STATUSES.FIX_PROPOSED }],
  [AGENT_REPORT_STATUSES.answered, { kinds: [FINDING_KINDS.QUESTION], status: FINDING_STATUSES.ANSWERED }],
  [
    AGENT_REPORT_STATUSES.reopened,
    { kinds: [FINDING_KINDS.CONCERN, FINDING_KINDS.QUESTION], status: FINDING_STATUSES.REOPENED },
  ],
);

/** Moves that need the agent to say why: an answer, or the reason to reopen. */
const NOTED_STATUSES = new Set<FindingStatus>([FINDING_STATUSES.ANSWERED, FINDING_STATUSES.REOPENED]);

/**
 * What a reported item does to a finding: the status it moves to, or why it is left alone. Agents follow
 * `agentFindingStatuses`: propose a fix for a concern, answer a question, or reopen with a reason what they
 * find still wrong; verifying stays with the reviewer.
 */
export function reportedStatus(
  finding: { kind: FindingKind; status: FindingStatus },
  item: Pick<iReportItem, 'status' | 'note'>,
): { status: FindingStatus } | { reason: ReportSkipReason } {
  const reported = emToZodSchema(agentReportStatusesEnumwaii).safeParse(item.status.toLowerCase());
  if (!reported.success) return { reason: REPORT_SKIP_REASONS.UNSUPPORTED_STATUS };
  const target = REPORTED_TARGETS.get(reported.data);
  if (!target.kinds.includes(finding.kind)) return { reason: REPORT_SKIP_REASONS.WRONG_KIND };
  if (finding.status === target.status) return { reason: REPORT_SKIP_REASONS.ALREADY_SET };
  if (!canAgentSetFindingStatus(finding.kind, finding.status, target.status)) {
    return { reason: REPORT_SKIP_REASONS.NOT_ALLOWED };
  }
  if (NOTED_STATUSES.has(target.status) && !item.note) return { reason: REPORT_SKIP_REASONS.MISSING_NOTE };
  return { status: target.status };
}
