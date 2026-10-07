import z from 'zod';

import { DIGEST_PARTS, digestPartsEnumwaii } from '@chaff/common/enums/digest.enums';

import { agentDiagramSchema, agentUnitNoteSchema } from '@~/features/digests/digest-output.schema';

/*
 * What the agent answers a rewrite with: the one part, shaped as in a whole digest. Units are named by the
 * short ids from the prompt.
 */

export const agentOverviewSchema = z.strictObject({ overview: z.string() });

export const agentRevisedNoteSchema = agentUnitNoteSchema.omit({ unit: true });

/** The JSON schema handed to the agent CLIs for each part. */
export const AGENT_REVISION_JSON_SCHEMAS = digestPartsEnumwaii.derive(
  [DIGEST_PARTS.OVERVIEW, z.toJSONSchema(agentOverviewSchema, { target: 'draft-7', io: 'input' })],
  [DIGEST_PARTS.UNIT_NOTE, z.toJSONSchema(agentRevisedNoteSchema, { target: 'draft-7', io: 'input' })],
  [DIGEST_PARTS.DIAGRAM, z.toJSONSchema(agentDiagramSchema, { target: 'draft-7', io: 'input' })],
);
