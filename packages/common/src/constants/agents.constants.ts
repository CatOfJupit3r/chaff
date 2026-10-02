/** Longest model id passed to a coding agent. */
export const MAX_AGENT_MODEL_LENGTH = 128;

/** A model id as one command-line token: letters, digits and `. _ : / @ [ ] -`, never starting with a dash. */
export const AGENT_MODEL_PATTERN = /^[\w.:/@[\]][\w.:/@[\]-]*$/;

/** Longest extra instructions a reviewer can add to a digest prompt. */
export const MAX_DIGEST_INSTRUCTIONS_LENGTH = 4000;
