import 'reflect-metadata';
import { container } from 'tsyringe';

import { DrizzleReviewTargetRepository } from '@~/features/reviews/review-targets/drizzle-review-target.repository';
import type { iReviewTargetRepository } from '@~/features/reviews/review-targets/review-target.repository';
import { DrizzleSnapshotRepository } from '@~/features/reviews/snapshots/drizzle-snapshot.repository';
import type { iSnapshotRepository } from '@~/features/reviews/snapshots/snapshot.repository';
import { DrizzleSettingsRepository } from '@~/features/settings/drizzle-settings.repository';
import type { iSettingsRepository } from '@~/features/settings/settings.repository';
import { DrizzleWorkspaceRepository } from '@~/features/workspaces/drizzle-workspace.repository';
import type { iWorkspaceRepository } from '@~/features/workspaces/workspace.repository';

import {
  REVIEW_TARGET_REPOSITORY_TOKEN,
  SETTINGS_REPOSITORY_TOKEN,
  SNAPSHOT_REPOSITORY_TOKEN,
  WORKSPACE_REPOSITORY_TOKEN,
} from './tokens';

/** Binds interface tokens to their implementations. `@singleton()` classes resolve by type. */
export function registerServices() {
  container.registerSingleton<iWorkspaceRepository>(WORKSPACE_REPOSITORY_TOKEN, DrizzleWorkspaceRepository);
  container.registerSingleton<iSettingsRepository>(SETTINGS_REPOSITORY_TOKEN, DrizzleSettingsRepository);
  container.registerSingleton<iReviewTargetRepository>(REVIEW_TARGET_REPOSITORY_TOKEN, DrizzleReviewTargetRepository);
  container.registerSingleton<iSnapshotRepository>(SNAPSHOT_REPOSITORY_TOKEN, DrizzleSnapshotRepository);
}
