/**
 * DI tokens for values and interfaces. Concrete `@singleton()` classes are injected by type
 * and need no token; use a token when injecting an interface or a plain value.
 */

export const CORE_OPTIONS_TOKEN = Symbol.for('CoreOptions');
export const CORE_HOST_TOKEN = Symbol.for('CoreHost');

export const WORKSPACE_REPOSITORY_TOKEN = Symbol.for('WorkspaceRepository');
export const SETTINGS_REPOSITORY_TOKEN = Symbol.for('SettingsRepository');
export const REVIEW_TARGET_REPOSITORY_TOKEN = Symbol.for('ReviewTargetRepository');
export const SNAPSHOT_REPOSITORY_TOKEN = Symbol.for('SnapshotRepository');
export const UNIT_MARK_REPOSITORY_TOKEN = Symbol.for('UnitMarkRepository');
export const FINDING_REPOSITORY_TOKEN = Symbol.for('FindingRepository');
export const DIGEST_REPOSITORY_TOKEN = Symbol.for('DigestRepository');
export const FIX_REPOSITORY_TOKEN = Symbol.for('FixRepository');
export const CONNECTION_REPOSITORY_TOKEN = Symbol.for('ConnectionRepository');
