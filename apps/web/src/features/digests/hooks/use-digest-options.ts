import { useState } from 'react';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { useSettings } from '@~/features/settings/hooks/use-settings';

import { useDigestModels } from './use-digest-models';

/**
 * The model and extra instructions for the next digest. The model starts as the one used last with the runner
 * and is picked per runner, so switching agents never carries a model id to the wrong CLI.
 */
export function useDigestOptions(runner: DigestRunner, isOpen: boolean) {
  const { digestModels } = useSettings();
  const [pickedModels, setPickedModels] = useState<ReadonlyMap<DigestRunner, string>>(new Map());
  const [instructions, setInstructions] = useState('');
  const { data: models = [], isPending: isModelsPending } = useDigestModels(runner, isOpen);
  const savedModel = digestModels.find((candidate) => candidate.runner === runner)?.model ?? '';
  const model = pickedModels.get(runner) ?? savedModel;

  return {
    models,
    isModelsPending,
    model,
    setModel: (value: string) => setPickedModels((current) => new Map(current).set(runner, value)),
    instructions,
    setInstructions,
    options: {
      model: model || undefined,
      instructions: instructions.trim() || undefined,
    },
  };
}
