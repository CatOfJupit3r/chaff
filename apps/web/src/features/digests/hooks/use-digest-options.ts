import { useState } from 'react';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import { useSettings } from '@~/features/settings/hooks/use-settings';

/** Model and extra instructions for the next digest, starting from the defaults in Settings for the chosen agent. */
export function useDigestOptions(runner: DigestRunner) {
  const { agentModels, digestInstructions } = useSettings();
  const [modelDraft, setModelDraft] = useState<{ runner: DigestRunner; model: string }>();
  const [instructionsDraft, setInstructionsDraft] = useState<string>();

  const defaultModel = agentModels.find((candidate) => candidate.runner === runner)?.model ?? '';
  const model = modelDraft?.runner === runner ? modelDraft.model : defaultModel;
  const instructions = instructionsDraft ?? digestInstructions;
  const trimmedModel = model.trim();

  return {
    model,
    instructions,
    isModelValid: trimmedModel === '' || isSafeAgentModel(trimmedModel),
    setModel: (next: string) => setModelDraft({ runner, model: next }),
    setInstructions: setInstructionsDraft,
    /** The chosen values as the digest is started with them. */
    picked: { model: trimmedModel, instructions: instructions.trim() },
    reset: () => {
      setModelDraft(undefined);
      setInstructionsDraft(undefined);
    },
  };
}
