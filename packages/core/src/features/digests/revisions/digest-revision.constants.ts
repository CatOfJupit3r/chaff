import { DIGEST_PARTS, digestPartsEnumwaii } from '@chaff/common/enums/digest.enums';

/** Folder under the data directory where rewrites check the snapshot out. */
export const REVISIONS_DIRECTORY = 'digest-revisions';

/** A rewrite that takes longer than this is stopped. */
export const REVISION_TIMEOUT_MS = 10 * 60 * 1000;

/** Characters of diff put in a rewrite's prompt; the agent reads the rest from the diff folder. */
export const MAX_REVISION_PATCH_CHARS = 20_000;

/** Progress is written at most this often. */
export const REVISION_PROGRESS_INTERVAL_MS = 400;

/** How the prompt names each part. */
export const DIGEST_PART_PROMPT_NAMES = digestPartsEnumwaii.derive(
  [DIGEST_PARTS.OVERVIEW, "the digest's overview of the branch"],
  [DIGEST_PARTS.UNIT_NOTE, "the digest's note on one unit"],
  [DIGEST_PARTS.DIAGRAM, 'one diagram of the digest'],
);
