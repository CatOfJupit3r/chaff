import { DIGEST_RUNNER_MODEL_FLAGS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import { AgentProcessError } from './agent-process';

/** The arguments that pick a model for a runner; none when the agent keeps its own default. */
export function agentModelArgs(runner: DigestRunner, model: string | undefined) {
  if (!model) return [];
  if (!isSafeAgentModel(model)) throw new AgentProcessError(`"${model}" is not a single model id`);
  return [DIGEST_RUNNER_MODEL_FLAGS(runner), model];
}
