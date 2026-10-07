import { and, asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { ANSWER_STATUSES } from '@chaff/common/enums/assistant.enums';

import { DatabaseService } from '@~/db/database.service';
import { assistantExchanges } from '@~/db/schema/assistant-exchanges.schema';

import type { iAssistantExchangeRepository } from './assistant-exchange.repository';
import { AssistantExchangeResolver } from './assistant-exchange.resolver';
import type { iAssistantExchangeUpdate, iNewAssistantExchange } from './assistant.types';

@singleton()
export class DrizzleAssistantExchangeRepository implements iAssistantExchangeRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly assistantExchangeResolver: AssistantExchangeResolver,
  ) {}

  public async create(exchange: iNewAssistantExchange) {
    const row = this.databaseService
      .getDb()
      .insert(assistantExchanges)
      .values({ ...exchange, status: ANSWER_STATUSES.WRITING })
      .returning()
      .get();
    return this.assistantExchangeResolver.toExchangeRecord(row);
  }

  public async findById(exchangeId: string) {
    const row = this.databaseService
      .getDb()
      .select()
      .from(assistantExchanges)
      .where(eq(assistantExchanges.id, exchangeId))
      .get();
    return row ? this.assistantExchangeResolver.toExchangeRecord(row) : undefined;
  }

  public async listForCard(snapshotId: string, cardId: string) {
    return this.databaseService
      .getDb()
      .select()
      .from(assistantExchanges)
      .where(and(eq(assistantExchanges.snapshotId, snapshotId), eq(assistantExchanges.cardId, cardId)))
      .orderBy(asc(assistantExchanges.askedAt))
      .all()
      .map((row) => this.assistantExchangeResolver.toExchangeRecord(row));
  }

  public async update(exchangeId: string, changes: iAssistantExchangeUpdate) {
    const row = this.databaseService
      .getDb()
      .update(assistantExchanges)
      .set(changes)
      .where(eq(assistantExchanges.id, exchangeId))
      .returning()
      .get();
    return row ? this.assistantExchangeResolver.toExchangeRecord(row) : undefined;
  }

  public async remove(exchangeId: string) {
    this.databaseService.getDb().delete(assistantExchanges).where(eq(assistantExchanges.id, exchangeId)).run();
  }

  public async failWriting(error: string) {
    const rows = this.databaseService
      .getDb()
      .update(assistantExchanges)
      .set({ status: ANSWER_STATUSES.FAILED, error, progress: null, answeredAt: new Date() })
      .where(eq(assistantExchanges.status, ANSWER_STATUSES.WRITING))
      .returning({ id: assistantExchanges.id })
      .all();
    return rows.length;
  }
}
