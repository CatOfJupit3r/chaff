import z from 'zod';

import { FINDING_KIND_LABELS, FINDING_SCOPE_LABELS, FINDING_SEVERITY_LABELS } from '@chaff/common/enums/review.enums';

import type { iFindingRecord } from './findings.types';

const MAX_TASK_CHARS = 600;
const MAX_VERIFY_CHARS = 300;

/** What the agent answers with; both fields are required so Codex's structured output accepts it. */
export const agentTaskSchema = z.strictObject({ task: z.string(), verify: z.string() });

export const AGENT_TASK_JSON_SCHEMA = z.toJSONSchema(agentTaskSchema, { target: 'draft-7' });

/** The agent's answer trimmed, or undefined when it is empty or too long to be a task. */
export function checkTask(answer: unknown) {
  const parsed = agentTaskSchema.safeParse(answer);
  if (!parsed.success) return undefined;
  const task = parsed.data.task.trim();
  const verify = parsed.data.verify.trim();
  if (!task || task.length > MAX_TASK_CHARS || verify.length > MAX_VERIFY_CHARS) return undefined;
  return { task, verify: verify || undefined };
}

function quoteBlock(text: string) {
  return text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

function anchorSection(anchor: iFindingRecord['anchors'][number]) {
  const lines =
    anchor.startLine === undefined || anchor.endLine === undefined ? '' : `:${anchor.startLine}-${anchor.endLine}`;
  const code = anchor.quote ? `\n\n${quoteBlock(anchor.quote)}` : '';
  return `${anchor.path}${lines} (${anchor.side.toLowerCase()} side)${code}`;
}

/** Asks for the finding restated as one task a coding agent can act on, no wider than the comment. */
export function buildTaskPrompt(finding: iFindingRecord) {
  const kind = FINDING_KIND_LABELS.get(finding.kind);
  const severity = finding.severity ? `, ${FINDING_SEVERITY_LABELS.get(finding.severity)}` : '';
  const places =
    finding.anchors.length > 0
      ? finding.anchors.map(anchorSection).join('\n\n')
      : `${FINDING_SCOPE_LABELS.get(finding.scope)}.`;
  return [
    'A reviewer wrote the comment below on a branch an AI coding agent produced. Restate it as one task the agent can act on.',
    '',
    'Rules:',
    "- Keep exactly the reviewer's intent. Never widen it: no extra requirements, refactors, tests or clean-up the reviewer did not ask for.",
    '- If the comment is a question, the task is to answer it, or to change the code only where the question implies it.',
    '- One or two short imperative sentences, naming the code it is about.',
    '- `verify`: one sentence saying how to tell the task is done. Leave it empty if there is nothing to check.',
    '- Everything you need is below; do not read files.',
    '',
    `Finding F-${finding.number} (${kind}${severity}) on ${finding.branch}, reviewed onto ${finding.parentBranch}.`,
    '',
    'Where:',
    places,
    '',
    'Comment, verbatim:',
    quoteBlock(finding.body),
    ...(finding.answer ? ['', 'Answer recorded so far:', quoteBlock(finding.answer)] : []),
    '',
    'Answer with JSON: {"task": "...", "verify": "..."}.',
  ].join('\n');
}
