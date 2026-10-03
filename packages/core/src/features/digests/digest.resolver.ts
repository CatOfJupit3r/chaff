import { singleton } from 'tsyringe';

import { digestRunnerSchema, digestStatusSchema } from '@chaff/common/enums/digest.enums';
import { digestContentSchema } from '@chaff/server-contract/contract/digests.contract';

import type { digests } from '@~/db/schema/digests.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iDigestRecord } from './digests.types';

type DigestRow = typeof digests.$inferSelect;

@singleton()
export class DigestResolver {
  public toDigestRecord = createRowResolver<DigestRow, iDigestRecord>({
    optional: ['progress', 'error', 'finishedAt'],
    overrides: (row) => ({
      runner: digestRunnerSchema.parse(row.runner),
      status: digestStatusSchema.parse(row.status),
      content: row.content === null ? undefined : digestContentSchema.parse(JSON.parse(row.content)),
    }),
  });
}
