import type { iAgentModel } from './agent-models.types';

/** Claude Code has no command that lists models; these are the aliases its `--model` help names, each the latest of its family. */
export const CLAUDE_CODE_MODELS: iAgentModel[] = [
  { id: 'fable', label: 'Fable', description: 'The latest Fable model' },
  { id: 'opus', label: 'Opus', description: 'The latest Opus model' },
  { id: 'sonnet', label: 'Sonnet', description: 'The latest Sonnet model' },
  { id: 'haiku', label: 'Haiku', description: 'The latest Haiku model' },
];

/** Arguments that make Codex print its model catalog as JSON. */
export const CODEX_MODEL_LIST_ARGS = ['debug', 'models'];

/** How long the catalog may take to print before the list is given up on. */
export const MODEL_LIST_TIMEOUT_MS = 15_000;
