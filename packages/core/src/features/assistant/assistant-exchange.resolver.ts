import { singleton } from 'tsyringe';

import { answerStatusSchema } from '@chaff/common/enums/assistant.enums';
import { digestRunnerSchema } from '@chaff/common/enums/digest.enums';

import type { assistantExchanges } from '@~/db/schema/assistant-exchanges.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iAssistantExchangeRecord } from './assistant.types';

type AssistantExchangeRow = typeof assistantExchanges.$inferSelect;

@singleton()
export class AssistantExchangeResolver {
  public toExchangeRecord = createRowResolver<AssistantExchangeRow, iAssistantExchangeRecord>({
    optional: ['answer', 'progress', 'error', 'model', 'answeredAt'],
    overrides: (row) => ({
      status: answerStatusSchema.parse(row.status),
      runner: digestRunnerSchema.parse(row.runner),
    }),
  });
}
