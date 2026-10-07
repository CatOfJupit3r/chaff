import {
  ANCHOR_MATCHES,
  FINDING_AUTHORS,
  FINDING_EVENT_SOURCES,
  FINDING_KIND_LABELS,
  FINDING_SEVERITY_LABELS,
  FINDING_STATUS_LABELS,
  findingAuthorsEnumwaii,
  findingEventSourcesEnumwaii,
} from '@chaff/common/enums/review.enums';

import { findingId } from '@~/features/exports/packet-format.utils';
import type { iFindingAnchorRecord, iFindingRecord } from '@~/features/findings/findings.types';

import type { iAgentScope } from './mcp.types';

const SHORT_SHA = 7;

const AUTHOR_NAMES = findingAuthorsEnumwaii.derive(
  [FINDING_AUTHORS.REVIEWER, 'Reviewer'],
  [FINDING_AUTHORS.AGENT, 'Agent'],
);

const SOURCE_NAMES = findingEventSourcesEnumwaii.derive(
  [FINDING_EVENT_SOURCES.REVIEWER, 'the reviewer'],
  [FINDING_EVENT_SOURCES.CHAFF, 'Chaff'],
  [FINDING_EVENT_SOURCES.AGENT, 'an agent'],
);

function lines(startLine: number | undefined, endLine: number | undefined) {
  if (startLine === undefined) return '';
  return endLine !== undefined && endLine > startLine ? `:${startLine}-${endLine}` : `:${startLine}`;
}

/** Where the anchor is in the newest snapshot it was looked for in; nothing before a newer snapshot exists. */
function currentPlace(anchor: iFindingAnchorRecord) {
  const latest = anchor.locations.at(-1);
  if (!latest) return [];
  const sha = latest.headSha.slice(0, SHORT_SHA);
  if (latest.match === ANCHOR_MATCHES.UNMATCHED) return [`Not found in the newest snapshot (${sha}).`];
  return [`Now at ${anchor.path}${lines(latest.startLine, latest.endLine)} (${sha}).`];
}

/** Where the anchor was reviewed, its quoted code, and where it is now. */
function anchorSection(anchor: iFindingAnchorRecord) {
  const quote = anchor.quote ? ['```', anchor.quote, '```'] : [];
  return [
    `At ${anchor.path}${lines(anchor.startLine, anchor.endLine)} as reviewed:`,
    ...quote,
    ...currentPlace(anchor),
  ].join('\n');
}

/** The finding's messages and status moves after it was written, oldest first. */
function discussionSection(finding: iFindingRecord) {
  const entries = [
    ...finding.messages.map((message) => ({
      createdAt: message.createdAt,
      text: `- ${AUTHOR_NAMES.get(message.author)}: ${message.body}`,
    })),
    ...finding.events.slice(1).map((event) => ({
      createdAt: event.createdAt,
      text: `- ${FINDING_STATUS_LABELS.get(event.status)} by ${SOURCE_NAMES.get(event.source)}${event.note ? `: ${event.note}` : ''}`,
    })),
  ].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  return entries.length > 0 ? ['Discussion:', ...entries.map((entry) => entry.text)].join('\n') : '';
}

function findingSection(finding: iFindingRecord) {
  const severity = finding.severity ? ` · ${FINDING_SEVERITY_LABELS.get(finding.severity)}` : '';
  return [
    `## ${findingId(finding)} · ${FINDING_KIND_LABELS.get(finding.kind)}${severity} · ${FINDING_STATUS_LABELS.get(finding.status)}`,
    '',
    finding.body,
    ...finding.anchors.map((anchor) => `\n${anchorSection(anchor)}`),
    ...(finding.answer ? ['', `Answer: ${finding.answer}`] : []),
    ...(finding.messages.length > 0 || finding.events.length > 1 ? ['', discussionSection(finding)] : []),
  ].join('\n');
}

/** The review's findings as an agent reads them: what each one asks, where, and what was said since. */
export function formatFindingsForAgent({ workspace, target }: iAgentScope, findings: readonly iFindingRecord[]) {
  const heading = `# Review of ${target.branch} onto ${target.parentBranch} in ${workspace.name}`;
  if (findings.length === 0) return `${heading}\n\nNo findings to address.`;
  return [
    heading,
    '',
    `${findings.length} finding${findings.length === 1 ? '' : 's'}. Fix concerns and answer questions, then reply on each with chaff_reply. The reviewer verifies every fix.`,
    ...findings.map((finding) => `\n${findingSection(finding)}`),
  ].join('\n');
}
