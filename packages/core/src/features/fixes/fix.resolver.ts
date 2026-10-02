import { singleton } from 'tsyringe';

import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';
import { fixStatusSchema } from '@chaff/common/enums/fix.enums';
import { reportResultSchema } from '@chaff/server-contract/contract/findings.contract';

import type { fixes } from '@~/db/schema/fixes.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iFixRecord } from './fixes.types';

type FixRow = typeof fixes.$inferSelect;

@singleton()
export class FixResolver {
  public toFixRecord = createRowResolver<FixRow, iFixRecord>({
    optional: ['progress', 'error', 'headSha', 'summary', 'finishedAt'],
    overrides: (row) => ({
      runner: digestRunnerSchema.parse(row.runner),
      status: fixStatusSchema.parse(row.status),
      files: row.files ?? [],
      report: row.report === null ? undefined : reportResultSchema.parse(JSON.parse(row.report)),
    }),
  });
}
