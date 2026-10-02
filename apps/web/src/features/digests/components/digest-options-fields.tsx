import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Field } from '@~/components/ui/field';
import { TextInput } from '@~/components/ui/text-input';

import type { useDigestOptions } from '../hooks/use-digest-options';

interface iDigestOptionsFieldsProps extends Pick<
  ReturnType<typeof useDigestOptions>,
  'model' | 'setModel' | 'instructions' | 'setInstructions' | 'isModelValid'
> {
  runner: DigestRunner;
}

/** The model the agent runs with and anything the reviewer wants it to look at on top of the usual digest. */
export function DigestOptionsFields({
  runner,
  model,
  setModel,
  instructions,
  setInstructions,
  isModelValid,
}: iDigestOptionsFieldsProps) {
  return (
    <>
      <Field
        label="Model"
        hint={
          isModelValid ? (
            `Passed to ${DIGEST_RUNNER_LABELS(runner)} as --model. Leave empty for its default.`
          ) : (
            <span className="text-bad">Use the model id or alias the CLI accepts, such as opus or gpt-6-astra.</span>
          )
        }
      >
        <TextInput
          aria-label="Model"
          aria-invalid={!isModelValid}
          value={model}
          placeholder={`${DIGEST_RUNNER_LABELS(runner)} default`}
          spellCheck={false}
          maxLength={100}
          className="font-mono text-[12.5px] aria-invalid:border-bad-line"
          onChange={(event) => setModel(event.target.value)}
        />
      </Field>
      <Field label="Extra instructions" hint="Added to the prompt. The digest keeps its usual shape.">
        <textarea
          aria-label="Extra instructions"
          value={instructions}
          maxLength={4000}
          rows={3}
          placeholder="e.g. Pay attention to error handling around retries."
          onChange={(event) => setInstructions(event.target.value)}
          className="min-h-[72px] w-full resize-y rounded-sm border border-line-strong bg-surface px-2.5 py-2 text-[13px] text-fg outline-none placeholder:text-faint focus:border-accent-line"
        />
      </Field>
    </>
  );
}
