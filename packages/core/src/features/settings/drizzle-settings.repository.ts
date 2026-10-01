import { eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { settings } from '@~/db/schema/settings.schema';

import { SETTINGS_ROW_ID } from './settings.constants';
import type { iSettingsRepository } from './settings.repository';
import { SettingsResolver } from './settings.resolver';
import type { iSettingsResponse } from './settings.types';

@singleton()
export class DrizzleSettingsRepository implements iSettingsRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly settingsResolver: SettingsResolver,
  ) {}

  public async get() {
    const row = this.databaseService.getDb().select().from(settings).where(eq(settings.id, SETTINGS_ROW_ID)).get();
    return row ? this.settingsResolver.toSettingsResponse(row) : undefined;
  }

  public async save(values: iSettingsResponse) {
    const row = this.databaseService
      .getDb()
      .insert(settings)
      .values({ id: SETTINGS_ROW_ID, ...values })
      .onConflictDoUpdate({ target: settings.id, set: { ...values, updatedAt: new Date() } })
      .returning()
      .get();
    return this.settingsResolver.toSettingsResponse(row);
  }
}
