import { useState } from 'react';

import { MAX_AGENT_MODEL_LENGTH } from '@chaff/common/constants/agents.constants';
import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_MODEL_EXAMPLES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import { TextInput } from '@~/components/ui/text-input';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';

/** The model a coding agent writes digests with by default; empty leaves it to the agent. */
export function AgentModelInput({ runner }: { runner: DigestRunner }) {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const saved = settings.agentModels.find((candidate) => candidate.runner === runner)?.model ?? '';
  const [draft, setDraft] = useState(saved);
  const model = draft.trim();
  const isValid = model === '' || isSafeAgentModel(model);

  const save = () => {
    if (model === saved || !isValid) return;
    const others = settings.agentModels.filter((candidate) => candidate.runner !== runner);
    updateSettings.mutate({ agentModels: model ? [...others, { runner, model }] : others });
  };

  return (
    <div className="flex flex-col gap-1">
      <TextInput
        aria-label={`${DIGEST_RUNNER_LABELS(runner)} model`}
        aria-invalid={!isValid}
        value={draft}
        maxLength={MAX_AGENT_MODEL_LENGTH}
        placeholder={`Model for digests, for example ${DIGEST_RUNNER_MODEL_EXAMPLES(runner)} (empty: the agent's default)`}
        spellCheck={false}
        autoComplete="off"
        className="max-w-[520px] font-mono text-[12.5px]"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {isValid ? null : (
        <span className="text-[12px] text-bad">One model id, with no spaces, that does not start with a dash.</span>
      )}
    </div>
  );
}
