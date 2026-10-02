import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Field } from '@~/components/ui/field';
import { SelectInput } from '@~/components/ui/text-input';

import type { useDigestOptions } from '../hooks/use-digest-options';

interface iDigestOptionsFieldsProps extends Pick<
  ReturnType<typeof useDigestOptions>,
  'models' | 'isModelsPending' | 'model' | 'setModel' | 'instructions' | 'setInstructions'
> {
  runner: DigestRunner;
}

function modelHint(runner: DigestRunner, isModelsPending: boolean, modelCount: number) {
  if (isModelsPending) return `Asking ${DIGEST_RUNNER_LABELS(runner)} for its models...`;
  if (modelCount === 0) return `${DIGEST_RUNNER_LABELS(runner)} didn't list its models, so it runs with its default.`;
  return `Passed to ${DIGEST_RUNNER_LABELS(runner)} as --model.`;
}

/** The model the agent runs with and anything the reviewer wants it to look at on top of the usual digest. */
export function DigestOptionsFields({
  runner,
  models,
  isModelsPending,
  model,
  setModel,
  instructions,
  setInstructions,
}: iDigestOptionsFieldsProps) {
  const isSavedModelListed = !model || models.some((candidate) => candidate.id === model);

  return (
    <>
      <Field label="Model" hint={modelHint(runner, isModelsPending, models.length)}>
        <SelectInput
          aria-label="Model"
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="w-full"
        >
          <option value="">{DIGEST_RUNNER_LABELS(runner)} default</option>
          {models.map((candidate) => (
            <option key={candidate.id} value={candidate.id} title={candidate.description}>
              {candidate.label}
              {candidate.description ? ` - ${candidate.description}` : ''}
            </option>
          ))}
          {isSavedModelListed ? null : <option value={model}>{model}</option>}
        </SelectInput>
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
