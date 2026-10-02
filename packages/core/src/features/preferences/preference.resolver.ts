import { singleton } from 'tsyringe';

import type { preferences } from '@~/db/schema/preferences.schema';
import { createRowResolver } from '@~/lib/row-resolver';

import type { iPreferenceRecord } from './preferences.types';

type PreferenceRow = typeof preferences.$inferSelect;

@singleton()
export class PreferenceResolver {
  public toPreferenceRecord = createRowResolver<PreferenceRow, iPreferenceRecord>({ optional: ['findingId'] });
}
