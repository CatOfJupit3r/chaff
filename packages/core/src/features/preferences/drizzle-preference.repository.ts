import { asc, eq } from 'drizzle-orm';
import { singleton } from 'tsyringe';

import { DatabaseService } from '@~/db/database.service';
import { preferences } from '@~/db/schema/preferences.schema';

import type { iPreferenceRepository } from './preference.repository';
import { PreferenceResolver } from './preference.resolver';
import type { iNewPreference } from './preferences.types';

@singleton()
export class DrizzlePreferenceRepository implements iPreferenceRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly preferenceResolver: PreferenceResolver,
  ) {}

  public async list(workspaceId: string) {
    const rows = this.databaseService
      .getDb()
      .select()
      .from(preferences)
      .where(eq(preferences.workspaceId, workspaceId))
      .orderBy(asc(preferences.createdAt))
      .all();
    return rows.map((row) => this.preferenceResolver.toPreferenceRecord(row));
  }

  public async findById(preferenceId: string) {
    const row = this.databaseService.getDb().select().from(preferences).where(eq(preferences.id, preferenceId)).get();
    return row ? this.preferenceResolver.toPreferenceRecord(row) : undefined;
  }

  public async create(preference: iNewPreference) {
    const row = this.databaseService.getDb().insert(preferences).values(preference).returning().get();
    return this.preferenceResolver.toPreferenceRecord(row);
  }

  public async update(preferenceId: string, text: string) {
    const row = this.databaseService
      .getDb()
      .update(preferences)
      .set({ text })
      .where(eq(preferences.id, preferenceId))
      .returning()
      .get();
    return row ? this.preferenceResolver.toPreferenceRecord(row) : undefined;
  }

  public async remove(preferenceId: string) {
    this.databaseService.getDb().delete(preferences).where(eq(preferences.id, preferenceId)).run();
  }
}
