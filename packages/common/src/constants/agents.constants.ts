/** Longest model id passed to a coding agent. */
export const MAX_AGENT_MODEL_LENGTH = 128;

/** A model id as one command-line token: letters, digits and `. _ : / @ [ ] -`, never starting with a dash. */
export const AGENT_MODEL_PATTERN = /^[\w.:/@[\]][\w.:/@[\]-]*$/;

/** Longest extra instructions a reviewer can add to a digest prompt. */
export const MAX_DIGEST_INSTRUCTIONS_LENGTH = 4000;

/** Model aliases Claude Code accepts for `--model`; it has no command that lists models. */
export const CLAUDE_CODE_MODEL_ALIASES = ['fable', 'opus', 'sonnet', 'haiku', 'opus[1m]', 'sonnet[1m]', 'opusplan'];

/** Codex models offered when `codex debug models` cannot be read. */
export const CODEX_FALLBACK_MODELS = [
  'gpt-6.1-sol',
  'gpt-6-astra',
  'gpt-6-sol',
  'gpt-6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
];

/** Characters of diff a digest prompt carries whole in Auto mode; past this the agent reads the diff from files. */
export const DIGEST_INLINE_PATCH_THRESHOLD_CHARS = 40_000;
