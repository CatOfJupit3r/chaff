import 'reflect-metadata';
import { container } from 'tsyringe';

import { DrizzleFindingRepository } from '@~/features/findings/drizzle-finding.repository';
import type { iFindingRepository } from '@~/features/findings/finding.repository';
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
  container.registerSingleton<iFindingRepository>(FINDING_REPOSITORY_TOKEN, DrizzleFindingRepository);
}
