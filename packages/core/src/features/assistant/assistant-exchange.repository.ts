import type { iAssistantExchangeRecord, iAssistantExchangeUpdate, iNewAssistantExchange } from './assistant.types';

export interface iAssistantExchangeRepository {
  /** Records a question as being answered. */
  create: (exchange: iNewAssistantExchange) => Promise<iAssistantExchangeRecord>;
  findById: (exchangeId: string) => Promise<iAssistantExchangeRecord | undefined>;
  /** The card's questions, oldest first. */
  listForCard: (snapshotId: string, cardId: string) => Promise<iAssistantExchangeRecord[]>;
  update: (exchangeId: string, changes: iAssistantExchangeUpdate) => Promise<iAssistantExchangeRecord | undefined>;
  remove: (exchangeId: string) => Promise<void>;
  /** Marks answers still being written, from a run the app did not finish, as failed. */
  failWriting: (error: string) => Promise<number>;
}
