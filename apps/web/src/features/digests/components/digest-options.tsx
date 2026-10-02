import { MAX_AGENT_MODEL_LENGTH, MAX_DIGEST_INSTRUCTIONS_LENGTH } from '@chaff/common/constants/agents.constants';
import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_MODEL_EXAMPLES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Field } from '@~/components/ui/field';
import { TextArea, TextInput } from '@~/components/ui/text-input';

import type { useDigestOptions } from '../hooks/use-digest-options';

interface iDigestOptionsProps {
  runner: DigestRunner;
  options: ReturnType<typeof useDigestOptions>;
}

/** Folded-away model and extra instructions for one digest; closed, the digest runs with the defaults from Settings. */
export function DigestOptions({ runner, options }: iDigestOptionsProps) {
  const { model, instructions, isModelValid, setModel, setInstructions, picked } = options;
  const summary = [picked.model || 'default model', picked.instructions ? 'extra instructions' : undefined]
    .filter(Boolean)
    .join(' · ');

  return (
    <details className="rounded-sm border border-line">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[12.5px] text-muted select-none hover:text-fg">
        <span>Model and instructions</span>
        <span className="ml-auto truncate font-mono text-[11.5px] text-faint">{summary}</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-3 pt-2.5 pb-3">
        <Field
          label="Model"
          hint={
            isModelValid ? (
              `Empty uses ${DIGEST_RUNNER_LABELS(runner)}'s own default.`
            ) : (
              <span className="text-bad">One model id, with no spaces, that does not start with a dash.</span>
            )
          }
        >
          <TextInput
            aria-label="Model"
            aria-invalid={!isModelValid}
            value={model}
            maxLength={MAX_AGENT_MODEL_LENGTH}
            placeholder={`for example ${DIGEST_RUNNER_MODEL_EXAMPLES(runner)}`}
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-[12.5px]"
            onChange={(event) => setModel(event.target.value)}
          />
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
