import { singleton } from 'tsyringe';

import { digestPartSchema, digestRunnerSchema, digestStatusSchema } from '@chaff/common/enums/digest.enums';

import type { digestRevisions } from '@~/db/schema/digest-revisions.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iDigestRevisionRecord, iDigestRevisionResponse } from './digest-revisions.types';
import { revisedPartSchema } from './revised-part.schema';

type DigestRevisionRow = typeof digestRevisions.$inferSelect;

@singleton()
export class DigestRevisionResolver {
  public toRevisionRecord = createRowResolver<DigestRevisionRow, iDigestRevisionRecord>({
    optional: ['partId', 'model', 'progress', 'error', 'finishedAt'],
    overrides: (row) => ({
      part: digestPartSchema.parse(row.part),
      runner: digestRunnerSchema.parse(row.runner),
      status: digestStatusSchema.parse(row.status),
      content: row.content === null ? undefined : revisedPartSchema.parse(JSON.parse(row.content)),
    }),
  });

  public toRevisionResponse = createRowResolver<iDigestRevisionRecord, iDigestRevisionResponse>({
    omit: ['digestId', 'content'],
  });
}
