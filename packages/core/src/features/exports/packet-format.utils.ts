import { CHANGE_REQUEST_PREFIXES } from '@chaff/common/enums/code-host.enums';
import { AGENT_REPORT_STATUSES } from '@chaff/common/enums/export.enums';
import {
  ANCHOR_MATCHES,
  FINDING_EVENT_SOURCES,
  FINDING_KIND_LABELS,
  FINDING_STATUS_LABELS,
  IS_ACTIVE_FINDING_STATUS,
  REVIEW_TARGET_KINDS,
} from '@chaff/common/enums/review.enums';

import type { iFindingRecord } from '@~/features/findings/findings.types';
import { preferencesPromptSection } from '@~/features/preferences/preference-format.utils';
import type { iReviewTargetRecord } from '@~/features/reviews/review-targets/review-targets.types';

import type { iPacket, iPacketAnchor, iPacketFinding, iPacketLines, iPacketReview } from './exports.types';

const SHORT_SHA = 7;

const short = (sha: string) => sha.slice(0, SHORT_SHA);

export const findingId = (finding: Pick<iFindingRecord, 'number'>) => `F-${finding.number}`;

/** How a review is named: `!41 Title` for a merge request, else the branch and what it is compared with. */
export function reviewTitle(target: iReviewTargetRecord) {
  if (target.kind === REVIEW_TARGET_KINDS.CHANGE_REQUEST && target.codeHost && target.changeNumber !== null) {
    const name = `${CHANGE_REQUEST_PREFIXES.get(target.codeHost)}${target.changeNumber}`;
    return `${target.title ? `${name} ${target.title}` : name} (${target.branch} onto ${target.parentBranch})`;
  }
  if (target.kind === REVIEW_TARGET_KINDS.WORKING_CHANGES) return `${target.branch}, uncommitted changes`;
  if (target.kind === REVIEW_TARGET_KINDS.CUMULATIVE)
    return `${target.branch}, everything since ${target.parentBranch}`;
  return `${target.branch} onto ${target.parentBranch}`;
}

function lineRange(lines: Pick<iPacketLines, 'startLine' | 'endLine'>) {
  if (lines.startLine === undefined) return '';
  if (lines.endLine === undefined || lines.endLine <= lines.startLine) return `:${lines.startLine}`;
  return `:${lines.startLine}-${lines.endLine}`;
}

/** `path:11-16 @ d525380`, with where the code went when it moved or could not be found. */
export function anchorLocation(anchor: iPacketAnchor) {
  const { current, original } = anchor;
  const unit = anchor.unitTitle ? ` (${anchor.unitTitle})` : '';
  if (current?.match === ANCHOR_MATCHES.UNMATCHED) {
    return `\`${anchor.path}${lineRange(original)}\`${unit} @ ${short(original.headSha)}, not found in ${short(current.headSha)}`;
  }
  const lines = current ?? original;
  return `\`${anchor.path}${lineRange(lines)}\`${unit} @ ${short(lines.headSha)}`;
}

function fenceLanguage(path: string) {
  const extension = /\.([\w]+)$/.exec(path)?.[1];
  return extension ?? '';
}

/** A fence longer than any run of backticks in the code, so the code can't close it. */
function fence(code: string) {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((match) => match[0].length));
  return '`'.repeat(longest + 1);
}

const indent = (text: string, prefix = '  ') =>
  text
    .split('\n')
    .map((line) => (line ? `${prefix}${line}` : prefix.trimEnd()))
    .join('\n');

function agentEvent(finding: iFindingRecord) {
  return finding.events.findLast((event) => event.source === FINDING_EVENT_SOURCES.AGENT);
}

function findingMarkdown({ finding, anchors }: iPacketFinding, shouldQuoteCode: boolean) {
  const isDone = !IS_ACTIVE_FINDING_STATUS.get(finding.status);
  const lines = [
    `- [${isDone ? 'x' : ' '}] **${findingId(finding)} · ${FINDING_KIND_LABELS.get(finding.kind)} · ${FINDING_STATUS_LABELS.get(finding.status)}**`,
  ];
  for (const anchor of anchors) lines.push(`  ${anchorLocation(anchor)}`);
  if (anchors.length === 0) lines.push('  On the whole branch');
  lines.push('', indent(finding.body, '  > '));
  if (shouldQuoteCode) {
    for (const anchor of anchors.filter((candidate) => candidate.original.quote !== '')) {
      const marker = fence(anchor.original.quote);
      lines.push('', `  ${marker}${fenceLanguage(anchor.path)}`, indent(anchor.original.quote), `  ${marker}`);
    }
  }
  if (finding.answer) lines.push('', indent(`Answer: ${finding.answer}`));
  const reported = agentEvent(finding);
  if (reported?.note) {
    const commits = reported.commits?.length ? ` (${reported.commits.map(short).join(', ')})` : '';
    lines.push('', indent(`Agent: ${reported.note}${commits}`));
  }
  if (finding.post?.url) lines.push('', `  Posted: ${finding.post.url}`);
  return lines.join('\n');
}

function reviewMarkdown(review: iPacketReview, shouldQuoteCode: boolean) {
  const lines = [
    `## ${reviewTitle(review.target)}`,
    '',
    `Snapshot ${short(review.snapshot.headSha)}, version ${review.snapshot.version}`,
  ];
  for (const item of review.findings) lines.push('', findingMarkdown(item, shouldQuoteCode));
  if (review.unreviewed.length > 0) {
    lines.push('', '### Units without a decision', '');
    for (const unit of review.unreviewed) {
      lines.push(`- \`${unit.path}\` ${unit.title}${unit.skipReason ? ` (skipped: ${unit.skipReason})` : ''}`);
    }
  }
  return lines.join('\n');
}

/** The packet as Markdown, for a person or a coding agent. Comments are quoted verbatim. */
export function packetMarkdown(packet: iPacket, options: { shouldQuoteCode: boolean }) {
  const count = packet.findingCount === 1 ? '1 finding' : `${packet.findingCount} findings`;
  return [
    `# Review findings · ${packet.repository}`,
    '',
    `${count} · exported ${packet.exportedAt.toISOString()}`,
    'Status key: open = needs a fix, fix proposed = waiting for the reviewer to check it, outdated = the code moved and must be found again.',
    ...packet.reviews.map((review) => `\n${reviewMarkdown(review, options.shouldQuoteCode)}`),
    '',
  ].join('\n');
}

const REPORT_EXAMPLE = [
  { id: 'F-12', status: AGENT_REPORT_STATUSES.fix_proposed, note: 'What you changed and why', commits: ['<sha>'] },
  { id: 'F-13', status: AGENT_REPORT_STATUSES.answered, note: 'The answer to the question' },
];

/** Instructions for a coding agent, the packet, and the report format Chaff reads back. */
export function agentPrompt(packet: iPacket, markdown: string) {
  return [
    `You are addressing code review findings in the repository ${packet.repository}. Each finding was written against a frozen snapshot; line numbers refer to the commit after the @.`,
    '',
    '- Work only on the findings below and leave everything else as it is.',
    '- Concerns: change the code so the concern no longer applies, then report it as `fix_proposed`.',
    '- Questions: answer them; report `answered` with the answer in `note`. Notes need no action.',
    '- Never mark a finding resolved or verified. The reviewer checks every fix.',
    '- If you disagree with a finding, leave it out of the report and explain why in your reply.',
    '',
    ...(packet.preferences.length > 0
      ? [
          preferencesPromptSection(packet.preferences, "The reviewer's preferences for this repository; follow them:"),
          '',
        ]
      : []),
    'When you are done, end your reply with a JSON report in a ```json block, one entry per finding you addressed:',
    '',
    '```json',
    JSON.stringify(REPORT_EXAMPLE, null, 2),
    '```',
    '',
    '---',
    '',
    markdown,
  ].join('\n');
}

function linesJson(lines: iPacketLines) {
  return { startLine: lines.startLine ?? null, endLine: lines.endLine ?? null, headSha: lines.headSha };
}

/** The packet as JSON with full anchors, for tools and round trips. Enum values are lowercase. */
export function packetJson(packet: iPacket) {
  return {
    format: 'chaff.review-packet',
    version: 1,
    repository: packet.repository,
    exportedAt: packet.exportedAt.toISOString(),
    preferences: packet.preferences,
    report: { statuses: Object.values(AGENT_REPORT_STATUSES), example: REPORT_EXAMPLE },
    reviews: packet.reviews.map(({ target, snapshot, findings, unreviewed }) => ({
      title: reviewTitle(target),
      kind: target.kind.toLowerCase(),
      branch: target.branch,
      parentBranch: target.parentBranch,
      change:
        target.codeHost && target.changeNumber !== null
          ? { host: target.codeHost.toLowerCase(), number: target.changeNumber, url: target.webUrl }
          : null,
      snapshot: {
        id: snapshot.id,
        version: snapshot.version,
        headSha: snapshot.headSha,
        parentHeadSha: snapshot.parentHeadSha,
        baseSha: snapshot.baseSha,
      },
      findings: findings.map(({ finding, anchors }) => ({
        id: findingId(finding),
        kind: finding.kind.toLowerCase(),
        status: finding.status.toLowerCase(),
        comment: finding.body,
        answer: finding.answer ?? null,
        createdAt: finding.createdAt.toISOString(),
        postedUrl: finding.post?.url ?? null,
        history: finding.events.map((event) => ({
          status: event.status.toLowerCase(),
          by: event.source.toLowerCase(),
          at: event.createdAt.toISOString(),
          note: event.note ?? null,
          commits: event.commits ?? [],
        })),
        anchors: anchors.map((anchor) => ({
          path: anchor.path,
          side: anchor.side.toLowerCase(),
          unit: anchor.unitTitle ?? null,
          original: {
            ...linesJson(anchor.original),
            quote: anchor.original.quote,
            contextBefore: anchor.original.contextBefore,
            contextAfter: anchor.original.contextAfter,
          },
          current: anchor.current ? { ...linesJson(anchor.current), match: anchor.current.match.toLowerCase() } : null,
        })),
      })),
      unreviewedUnits: unreviewed.map((unit) => ({
        path: unit.path,
        title: unit.title,
        kind: unit.kind.toLowerCase(),
        skipReason: unit.skipReason ?? null,
      })),
    })),
  };
}
