import type { AnswerStatus } from '@chaff/common/enums/assistant.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import type { assistantExchanges } from '@~/db/schema/assistant-exchanges.schema';
import type { iDigestContent, iPromptUnit } from '@~/features/digests/digests.types';

type AssistantExchangeRow = typeof assistantExchanges.$inferSelect;

export type iAssistantExchangeRecord = Omit<
  AssistantExchangeRow,
  'answer' | 'status' | 'progress' | 'error' | 'runner' | 'model' | 'answeredAt'
> & {
  answer?: string;
  status: AnswerStatus;
  progress?: string;
  error?: string;
  runner: DigestRunner;
  model?: string;
  answeredAt?: Date;
};

export type iNewAssistantExchange = Pick<
  iAssistantExchangeRecord,
  'snapshotId' | 'cardId' | 'question' | 'runner' | 'model'
>;

export interface iAssistantExchangeUpdate {
  answer?: string;
  status?: AnswerStatus;
  progress?: string | null;
  error?: string | null;
  answeredAt?: Date;
}

/** What the reviewer asks about one card. */
export interface iAssistantQuestion {
  snapshotId: string;
  cardId: string;
  cardTitle: string;
  unitIds: readonly string[];
  question: string;
}

export interface iAssistantPromptInput {
  branch: string;
  parentBranch: string;
  baseSha: string;
  headSha: string;
  cardTitle: string;
  /** The card's units. */
  units: iPromptUnit[];
  diffDirectory: string;
  /** The diff of the card's files, cut to fit. */
  patch: string;
  /** The digest, with each part's selected version, when one is ready. */
  digest?: iDigestContent;
  /** The questions answered on the card before this one, oldest first. */
  earlier: Pick<iAssistantExchangeRecord, 'question' | 'answer'>[];
  question: string;
  /** The agent can read the review's findings through the Chaff MCP server. */
  hasChaffTools: boolean;
}
