import z from 'zod';

import { diagramKindSchema, intentSourceSchema, testTierSchema } from '@chaff/common/enums/digest.enums';

/*
 * What the agent must answer with. Every field is required and objects are closed, because Codex's
 * structured output accepts only that shape; empty strings and arrays stand in for "nothing to say".
 * Units are named by the short ids from the prompt (`u1`, `u2`, ...).
 */

const agentTestSchema = z.strictObject({
  path: z.string(),
  line: z.number().int().nullable(),
  tier: testTierSchema,
  note: z.string(),
});

const agentUnitNoteSchema = z.strictObject({
  unit: z.string(),
  summary: z.string(),
  worthChecking: z.array(z.string()),
  tests: z.array(agentTestSchema),
});

const agentGroupSchema = z.strictObject({
  title: z.string(),
  before: z.string(),
  after: z.string(),
  intent: z.string(),
  intentSource: intentSourceSchema,
  units: z.array(z.string()),
});

const agentDiagramSchema = z.strictObject({
  title: z.string(),
  kind: diagramKindSchema,
  mermaid: z.string(),
  units: z.array(z.string()),
  isSuggestion: z.boolean(),
});

export const agentDigestSchema = z.strictObject({
  overview: z.string(),
  groups: z.array(agentGroupSchema),
  readingOrder: z.array(z.string()),
  units: z.array(agentUnitNoteSchema),
  diagrams: z.array(agentDiagramSchema),
});

export type iAgentDigest = z.infer<typeof agentDigestSchema>;

/** The JSON schema handed to the agent CLIs. */
export const AGENT_DIGEST_JSON_SCHEMA = z.toJSONSchema(agentDigestSchema, { target: 'draft-7' });
