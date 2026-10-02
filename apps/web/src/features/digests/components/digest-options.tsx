import { useState } from 'react';

import { MAX_DIGEST_INSTRUCTIONS_LENGTH } from '@chaff/common/constants/agents.constants';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Field } from '@~/components/ui/field';
import { TextArea } from '@~/components/ui/text-input';

import type { useDigestOptions } from '../hooks/use-digest-options';
import { AgentModelSelect } from './agent-model-select';

interface iDigestOptionsProps {
  runner: DigestRunner;
  options: ReturnType<typeof useDigestOptions>;
}

/** Folded-away model and extra instructions for one digest; closed, the digest runs with the defaults from Settings. */
export function DigestOptions({ runner, options }: iDigestOptionsProps) {
  const { model, instructions, setModel, setInstructions, picked } = options;
  const [isOpen, setIsOpen] = useState(false);
  const summary = [picked.model || 'default model', picked.instructions ? 'extra instructions' : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <details className="rounded-sm border border-line" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12.5px] text-muted select-none hover:text-fg">
        <span>Model and instructions</span>
        <span className="ml-auto truncate font-mono text-[11.5px] text-faint">{summary}</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-3 pt-2.5 pb-3">
        <Field label="Model">
          <AgentModelSelect key={runner} runner={runner} value={model} isEnabled={isOpen} onChange={setModel} />
        </Field>
        <Field
          label="Extra instructions"
          hint="Added to the prompt in their own section. The digest keeps its usual shape."
        >
          <TextArea
            aria-label="Extra instructions"
            value={instructions}
            maxLength={MAX_DIGEST_INSTRUCTIONS_LENGTH}
            rows={3}
            placeholder="For example: focus on error handling and say where retries can loop."
            onChange={(event) => setInstructions(event.target.value)}
          />
        </Field>
      </div>
    </details>
  );
}
