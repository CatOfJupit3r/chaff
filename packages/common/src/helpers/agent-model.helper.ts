import { AGENT_MODEL_PATTERN, MAX_AGENT_MODEL_LENGTH } from '../constants/agents.constants';

/** Whether a model id can be handed to an agent CLI as one argument without being read as an option. */
export function isSafeAgentModel(model: string) {
  return model.length <= MAX_AGENT_MODEL_LENGTH && AGENT_MODEL_PATTERN.test(model);
}
