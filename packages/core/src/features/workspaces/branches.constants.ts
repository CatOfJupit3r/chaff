/** Remote-tracking branches without a local branch join the list only when committed to this recently. */
export const REMOTE_BRANCH_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/** Most remote-tracking branches listed, newest first. */
export const REMOTE_BRANCH_LIMIT = 100;
