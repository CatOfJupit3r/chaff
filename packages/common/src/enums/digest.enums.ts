import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** The coding agent on this machine that writes a digest. */
export const digestRunnersEnumwaii = new Enumwaii('DigestRunner', ['CLAUDE_CODE', 'CODEX']);

export const DIGEST_RUNNERS = digestRunnersEnumwaii.enum;
export type DigestRunner = InferEnumwaii<typeof digestRunnersEnumwaii>;
export const digestRunnerSchema = digestRunnersEnumwaii.schema;
export const digestRunnerValues = digestRunnersEnumwaii.values;

export const DIGEST_RUNNER_LABELS = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'Claude Code',
  [DIGEST_RUNNERS.CODEX]: 'Codex',
});

/** Who receives the repository context when the runner works. */
export const DIGEST_RUNNER_PROVIDERS = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'Anthropic',
  [DIGEST_RUNNERS.CODEX]: 'OpenAI',
});

export const digestStatusesEnumwaii = new Enumwaii('DigestStatus', ['RUNNING', 'READY', 'FAILED', 'CANCELLED']);

export const DIGEST_STATUSES = digestStatusesEnumwaii.enum;
export type DigestStatus = InferEnumwaii<typeof digestStatusesEnumwaii>;
export const digestStatusSchema = digestStatusesEnumwaii.schema;

/** How much a test claim is worth: a relevant test exists, it was read, or it passed against the snapshot. */
export const testTiersEnumwaii = new Enumwaii('TestTier', ['EXISTS', 'INSPECTED', 'PASSED']);

export const TEST_TIERS = testTiersEnumwaii.enum;
export type TestTier = InferEnumwaii<typeof testTiersEnumwaii>;
export const testTierSchema = testTiersEnumwaii.schema;

/** Whether a stated reason comes from the branch itself (commit messages, comments) or was inferred. */
export const intentSourcesEnumwaii = new Enumwaii('IntentSource', ['DOCUMENTED', 'INFERRED']);

export const INTENT_SOURCES = intentSourcesEnumwaii.enum;
export type IntentSource = InferEnumwaii<typeof intentSourcesEnumwaii>;
export const intentSourceSchema = intentSourcesEnumwaii.schema;

export const diagramKindsEnumwaii = new Enumwaii('DiagramKind', ['FLOW', 'STATE', 'SEQUENCE', 'OWNERSHIP']);

export const DIAGRAM_KINDS = diagramKindsEnumwaii.enum;
export type DiagramKind = InferEnumwaii<typeof diagramKindsEnumwaii>;
export const diagramKindSchema = diagramKindsEnumwaii.schema;
