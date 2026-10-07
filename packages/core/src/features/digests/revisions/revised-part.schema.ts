import z from 'zod';

import { DIGEST_PARTS } from '@chaff/common/enums/digest.enums';
import { digestDiagramSchema, digestUnitNoteSchema } from '@chaff/server-contract/contract/digests.contract';

/** A checked version of one digest part, as it is stored. */
export const revisedPartSchema = z.discriminatedUnion('part', [
  z.object({ part: z.literal(DIGEST_PARTS.OVERVIEW), overview: z.string() }),
  z.object({ part: z.literal(DIGEST_PARTS.UNIT_NOTE), note: digestUnitNoteSchema }),
  z.object({ part: z.literal(DIGEST_PARTS.DIAGRAM), diagram: digestDiagramSchema }),
]);
