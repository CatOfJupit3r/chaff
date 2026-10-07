import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** The coding agent on this machine that writes a digest. */
export const digestRunnersEnumwaii = em(['CLAUDE_CODE', 'CODEX']);

export const DIGEST_RUNNERS = digestRunnersEnumwaii.enum;
export type DigestRunner = InferEnumwaii<typeof digestRunnersEnumwaii>;
export const digestRunnerSchema = emToZodSchema(digestRunnersEnumwaii);
export const digestRunnerValues = digestRunnersEnumwaii.values;

export const DIGEST_RUNNER_LABELS = digestRunnersEnumwaii.derive(
  [DIGEST_RUNNERS.CLAUDE_CODE, 'Claude Code'],
  [DIGEST_RUNNERS.CODEX, 'Codex'],
);

/** The command looked up on PATH when Settings names no other. */
export const DIGEST_RUNNER_COMMANDS = digestRunnersEnumwaii.derive(
  [DIGEST_RUNNERS.CLAUDE_CODE, 'claude'],
  [DIGEST_RUNNERS.CODEX, 'codex'],
);

/** Who receives the repository context when the runner works. */
export const DIGEST_RUNNER_PROVIDERS = digestRunnersEnumwaii.derive(
  [DIGEST_RUNNERS.CLAUDE_CODE, 'Anthropic'],
  [DIGEST_RUNNERS.CODEX, 'OpenAI'],
);

export const digestStatusesEnumwaii = em(['RUNNING', 'READY', 'FAILED', 'CANCELLED']);

export const DIGEST_STATUSES = digestStatusesEnumwaii.enum;
export type DigestStatus = InferEnumwaii<typeof digestStatusesEnumwaii>;
export const digestStatusSchema = emToZodSchema(digestStatusesEnumwaii);

/** The parts of a digest the reviewer can have rewritten with instructions; earlier versions are kept. */
export const digestPartsEnumwaii = em(['OVERVIEW', 'UNIT_NOTE', 'DIAGRAM']);

export const DIGEST_PARTS = digestPartsEnumwaii.enum;
export type DigestPart = InferEnumwaii<typeof digestPartsEnumwaii>;
export const digestPartSchema = emToZodSchema(digestPartsEnumwaii);

/** How much a test claim is worth: a relevant test exists, it was read, or it passed against the snapshot. */
export const testTiersEnumwaii = em(['EXISTS', 'INSPECTED', 'PASSED']);

export const TEST_TIERS = testTiersEnumwaii.enum;
export type TestTier = InferEnumwaii<typeof testTiersEnumwaii>;
export const testTierSchema = emToZodSchema(testTiersEnumwaii);

/** Whether a stated reason comes from the branch itself (commit messages, comments) or was inferred. */
export const intentSourcesEnumwaii = em(['DOCUMENTED', 'INFERRED']);

export const INTENT_SOURCES = intentSourcesEnumwaii.enum;
export type IntentSource = InferEnumwaii<typeof intentSourcesEnumwaii>;
export const intentSourceSchema = emToZodSchema(intentSourcesEnumwaii);

export const diagramKindsEnumwaii = em(['FLOW', 'STATE', 'SEQUENCE', 'OWNERSHIP']);

export const DIAGRAM_KINDS = diagramKindsEnumwaii.enum;
export type DiagramKind = InferEnumwaii<typeof diagramKindsEnumwaii>;
export const diagramKindSchema = emToZodSchema(diagramKindsEnumwaii);
