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

/** The command looked up on PATH when Settings names no other. */
export const DIGEST_RUNNER_COMMANDS = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'claude',
  [DIGEST_RUNNERS.CODEX]: 'codex',
});

/** The option that picks the model on each agent's command line. */
export const DIGEST_RUNNER_MODEL_FLAGS = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: '--model',
  [DIGEST_RUNNERS.CODEX]: '-m',
});

/** A model id each agent accepts, shown as an example. */
export const DIGEST_RUNNER_MODEL_EXAMPLES = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'opus',
  [DIGEST_RUNNERS.CODEX]: 'gpt-6-astra',
});

/** Who receives the repository context when the runner works. */
export const DIGEST_RUNNER_PROVIDERS = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: 'Anthropic',
  [DIGEST_RUNNERS.CODEX]: 'OpenAI',
});

/** How the branch's diff reaches the agent: in the prompt, or as files it reads when it needs them. */
export const digestDiffModesEnumwaii = new Enumwaii('DigestDiffMode', ['AUTO', 'INLINE', 'ON_DEMAND']);

export const DIGEST_DIFF_MODES = digestDiffModesEnumwaii.enum;
export type DigestDiffMode = InferEnumwaii<typeof digestDiffModesEnumwaii>;
export const digestDiffModeSchema = digestDiffModesEnumwaii.schema;
export const digestDiffModeValues = digestDiffModesEnumwaii.values;

export const DIGEST_DIFF_MODE_LABELS = digestDiffModesEnumwaii.derive({
  [DIGEST_DIFF_MODES.AUTO]: 'Auto',
  [DIGEST_DIFF_MODES.INLINE]: 'Always inline',
  [DIGEST_DIFF_MODES.ON_DEMAND]: 'Read on demand',
});

/** What one digest run settles on: the diff in the prompt, or read from files on demand. */
export const digestDiffDeliveriesEnumwaii = digestDiffModesEnumwaii.pick('DigestDiffDelivery', [
  DIGEST_DIFF_MODES.INLINE,
  DIGEST_DIFF_MODES.ON_DEMAND,
]);

export const DIGEST_DIFF_DELIVERIES = digestDiffDeliveriesEnumwaii.enum;
export type DigestDiffDelivery = InferEnumwaii<typeof digestDiffDeliveriesEnumwaii>;

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
