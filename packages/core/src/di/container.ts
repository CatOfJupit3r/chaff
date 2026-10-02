import 'reflect-metadata';
import { container } from 'tsyringe';

import type { iConnectionRepository } from '@~/features/code-hosts/connection.repository';
import { DrizzleConnectionRepository } from '@~/features/code-hosts/drizzle-connection.repository';
import type { iDigestRepository } from '@~/features/digests/digest.repository';
import { DrizzleDigestRepository } from '@~/features/digests/drizzle-digest.repository';
import { DrizzleFindingRepository } from '@~/features/findings/drizzle-finding.repository';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
import { DrizzleFixRepository } from '@~/features/fixes/drizzle-fix.repository';
import type { iFixRepository } from '@~/features/fixes/fix.repository';
import { DrizzlePreferenceRepository } from '@~/features/preferences/drizzle-preference.repository';
import type { iPreferenceRepository } from '@~/features/preferences/preference.repository';
import type { iChangeUnitRepository } from '@~/features/reviews/change-units/change-unit.repository';
import { DrizzleChangeUnitRepository } from '@~/features/reviews/change-units/drizzle-change-unit.repository';
import { DrizzleUnitMarkRepository } from '@~/features/reviews/marks/drizzle-unit-mark.repository';
import type { iUnitMarkRepository } from '@~/features/reviews/marks/unit-mark.repository';
import { DrizzleReviewTargetRepository } from '@~/features/reviews/review-targets/drizzle-review-target.repository';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { DrizzleSnapshotRepository } from '@~/features/reviews/snapshots/drizzle-snapshot.repository';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { DrizzleSettingsRepository } from '@~/features/settings/drizzle-settings.repository';
import type { iSettingsRepository } from '@~/features/settings/settings.repository';
import { DrizzleWorkspaceRepository } from '@~/features/workspaces/drizzle-workspace.repository';
import type { iWorkspaceRepository } from '@~/features/workspaces/workspace.repository';

import {
  CHANGE_UNIT_REPOSITORY_TOKEN,
  CONNECTION_REPOSITORY_TOKEN,
  DIGEST_REPOSITORY_TOKEN,
  FIX_REPOSITORY_TOKEN,
  PREFERENCE_REPOSITORY_TOKEN,
  FINDING_REPOSITORY_TOKEN,
  REVIEW_TARGET_REPOSITORY_TOKEN,
  SETTINGS_REPOSITORY_TOKEN,
  SNAPSHOT_REPOSITORY_TOKEN,
  UNIT_MARK_REPOSITORY_TOKEN,
  WORKSPACE_REPOSITORY_TOKEN,
} from './tokens';

/** Binds interface tokens to their implementations. `@singleton()` classes resolve by type. */
export function registerServices() {
  container.registerSingleton<iWorkspaceRepository>(WORKSPACE_REPOSITORY_TOKEN, DrizzleWorkspaceRepository);
  container.registerSingleton<iSettingsRepository>(SETTINGS_REPOSITORY_TOKEN, DrizzleSettingsRepository);
  container.registerSingleton<iReviewTargetRepository>(REVIEW_TARGET_REPOSITORY_TOKEN, DrizzleReviewTargetRepository);
  container.registerSingleton<iSnapshotRepository>(SNAPSHOT_REPOSITORY_TOKEN, DrizzleSnapshotRepository);
  container.registerSingleton<iUnitMarkRepository>(UNIT_MARK_REPOSITORY_TOKEN, DrizzleUnitMarkRepository);
  container.registerSingleton<iChangeUnitRepository>(CHANGE_UNIT_REPOSITORY_TOKEN, DrizzleChangeUnitRepository);
  container.registerSingleton<iFindingRepository>(FINDING_REPOSITORY_TOKEN, DrizzleFindingRepository);
  container.registerSingleton<iDigestRepository>(DIGEST_REPOSITORY_TOKEN, DrizzleDigestRepository);
  container.registerSingleton<iFixRepository>(FIX_REPOSITORY_TOKEN, DrizzleFixRepository);
  container.registerSingleton<iPreferenceRepository>(PREFERENCE_REPOSITORY_TOKEN, DrizzlePreferenceRepository);
  container.registerSingleton<iConnectionRepository>(CONNECTION_REPOSITORY_TOKEN, DrizzleConnectionRepository);
}
