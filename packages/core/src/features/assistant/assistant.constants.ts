/** Folder under the data directory where answers check the snapshot out. */
export const ANSWERS_DIRECTORY = 'answers';

/** An answer that takes longer than this is stopped. */
export const ANSWER_TIMEOUT_MS = 10 * 60 * 1000;

/** Characters of the card's diff put in the prompt; the agent reads the rest from the diff folder. */
export const MAX_ANSWER_PATCH_CHARS = 20_000;

/** The answer so far and the progress are written at most this often. */
export const ANSWER_WRITE_INTERVAL_MS = 300;
