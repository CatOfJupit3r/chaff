import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { singleton } from 'tsyringe';

import { CLAUDE_CODE_MODEL_ALIASES, CODEX_FALLBACK_MODELS } from '@chaff/common/constants/agents.constants';
import { DIGEST_RUNNER_LABELS, DIGEST_RUNNERS, digestRunnersEnumwaii } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import { AgentCommandsService } from './agent-commands.service';
import type { iAgentModelOption } from './agent-models.utils';
import { parseModelList, parseTomlModel } from './agent-models.utils';
import { runAgentCommand } from './agent-process';

/** How long asking an agent for its models may take. */
const LIST_MODELS_TIMEOUT_MS = 15_000;
const MAX_REASON_CHARS = 300;

/** Models offered when the agent cannot be asked, or has nothing to ask. */
const FALLBACK_MODELS = digestRunnersEnumwaii.derive({
  [DIGEST_RUNNERS.CLAUDE_CODE]: CLAUDE_CODE_MODEL_ALIASES,
  [DIGEST_RUNNERS.CODEX]: CODEX_FALLBACK_MODELS,
});

export interface iAgentModelList {
  runner: DigestRunner;
  models: iAgentModelOption[];
  defaultModel?: string;
  isDiscovered: boolean;
  reason?: string;
}

interface iCachedList {
  command: string;
  list: Promise<iAgentModelList>;
}

const asOptions = (ids: readonly string[]) => ids.map((id) => ({ id }));

function describeFailure(error: unknown) {
  let text = String(error);
  if (error instanceof Error) {
    text = error.message;
    const stderr = (error as Error & { stderr?: string }).stderr?.trim();
    if (stderr) text = stderr;
  }
  return text.split('\n')[0]?.slice(0, MAX_REASON_CHARS) ?? '';
}

/** An agent's configuration folder: the one its environment variable names, else the usual one in the home folder. */
function configFolder(variable: string | undefined, usual: string) {
  if (variable) return variable;
  return path.join(homedir(), usual);
}

async function readTextFile(filePath: string) {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

/** The model Codex uses by default, from `$CODEX_HOME/config.toml` (`~/.codex` unless set). */
async function codexDefaultModel() {
  const folder = configFolder(process.env.CODEX_HOME, '.codex');
  const toml = await readTextFile(path.join(folder, 'config.toml'));
  const model = toml === undefined ? undefined : parseTomlModel(toml);
  return model && isSafeAgentModel(model) ? model : undefined;
}

/** The model Claude Code uses by default, from `$CLAUDE_CONFIG_DIR/settings.json` (`~/.claude` unless set). */
async function claudeCodeDefaultModel() {
  const folder = configFolder(process.env.CLAUDE_CONFIG_DIR, '.claude');
  const json = await readTextFile(path.join(folder, 'settings.json'));
  if (json === undefined) return undefined;
  try {
    const { model } = JSON.parse(json) as { model?: unknown };
    return typeof model === 'string' && isSafeAgentModel(model.trim()) ? model.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The models each coding agent offers. Codex is asked with `codex debug models` once per session (again when its
 * command changes or a refresh is asked for); Claude Code has no such command, so its documented aliases are offered.
 * When the agent cannot be asked, a built-in list comes back with the reason instead of an error.
 */
@singleton()
export class AgentModelsService {
  private readonly cache = new Map<DigestRunner, iCachedList>();

  constructor(private readonly agentCommandsService: AgentCommandsService) {}

  public async list(runner: DigestRunner, shouldRefresh = false): Promise<iAgentModelList> {
    const command = await this.agentCommandsService.find(runner);
    const cached = this.cache.get(runner);
    if (cached?.command === (command ?? '') && !shouldRefresh) return cached.list;
    const list = this.discover(runner, command);
    this.cache.set(runner, { command: command ?? '', list });
    return list;
  }

  private async discover(runner: DigestRunner, command: string | undefined): Promise<iAgentModelList> {
    const fallback = { runner, models: asOptions(FALLBACK_MODELS(runner)), isDiscovered: false };
    if (runner === DIGEST_RUNNERS.CLAUDE_CODE) return { ...fallback, defaultModel: await claudeCodeDefaultModel() };

    const defaultModel = await codexDefaultModel();
    if (!command) {
      return { ...fallback, defaultModel, reason: `${DIGEST_RUNNER_LABELS(runner)} was not found on this computer` };
    }
    try {
      const output = await runAgentCommand(command, ['debug', 'models'], LIST_MODELS_TIMEOUT_MS);
      const parsed = parseModelList(output);
      if (parsed.models.length === 0) {
        return { ...fallback, defaultModel, reason: '`codex debug models` listed no models Chaff could read' };
      }
      return { runner, models: parsed.models, defaultModel: defaultModel ?? parsed.defaultModel, isDiscovered: true };
    } catch (error) {
      return { ...fallback, defaultModel, reason: `\`codex debug models\` failed: ${describeFailure(error)}` };
    }
  }
}
