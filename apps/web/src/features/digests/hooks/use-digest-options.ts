import { useState } from 'react';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { digestModelSchema } from '@chaff/server-contract/contract/digests.contract';

import { useSettings } from '@~/features/settings/hooks/use-settings';

/**
 * The model and extra instructions for the next digest. The model starts as the one used last with the runner
 * and is typed per runner, so switching agents never carries a model id to the wrong CLI.
 */
export function useDigestOptions(runner: DigestRunner) {
  const { digestModels } = useSettings();
  const [typedModels, setTypedModels] = useState<ReadonlyMap<DigestRunner, string>>(new Map());
  const [instructions, setInstructions] = useState('');
  const savedModel = digestModels.find((candidate) => candidate.runner === runner)?.model ?? '';
  const model = typedModels.get(runner) ?? savedModel;
  const trimmedModel = model.trim();
  const isModelValid = trimmedModel === '' || digestModelSchema.safeParse(trimmedModel).success;

  return {
    model,
    setModel: (value: string) => setTypedModels((current) => new Map(current).set(runner, value)),
    instructions,
    setInstructions,
    isModelValid,
    options: {
      model: trimmedModel || undefined,
      instructions: instructions.trim() || undefined,
    },
  };
}
