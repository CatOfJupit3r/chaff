import { useState } from 'react';

import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import { AgentModelSelect } from '@~/features/digests/components/agent-model-select';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';

/** The model a coding agent writes digests with by default; the agent's own default when none is picked. */
export function AgentModelInput({ runner }: { runner: DigestRunner }) {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const saved = settings.agentModels.find((candidate) => candidate.runner === runner)?.model ?? '';
  const [draft, setDraft] = useState(saved);

  const save = (model: string) => {
    if (model === saved || (model !== '' && !isSafeAgentModel(model))) return;
    const others = settings.agentModels.filter((candidate) => candidate.runner !== runner);
    updateSettings.mutate({ agentModels: model ? [...others, { runner, model }] : others });
  };

  return <AgentModelSelect runner={runner} value={draft} onChange={setDraft} onCommit={save} />;
}
