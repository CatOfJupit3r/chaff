import { useState } from 'react';

import { MAX_AGENT_MODEL_LENGTH } from '@chaff/common/constants/agents.constants';
import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_MODEL_EXAMPLES } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';
import { isSafeAgentModel } from '@chaff/common/helpers/agent-model.helper';

import { Button } from '@~/components/ui/button';
import { SelectInput, TextInput } from '@~/components/ui/text-input';

import { AGENT_MODEL_PICKS } from '../digests.enums';
import { useAgentModels } from '../hooks/use-agent-models';

/** Option values of listed models carry this prefix, which no model id or pick can start with. */
const LISTED_PREFIX = '=';

interface iAgentModelSelectProps {
  runner: DigestRunner;
  /** The chosen model id; empty for the agent's own default. */
  value: string;
  /** Every change, including each key typed in a custom id. */
  onChange: (model: string) => void;
  /** A settled choice: a pick from the list, or a custom id when its field is left. */
  onCommit?: (model: string) => void;
  /** Whether to ask for the agent's models yet. */
  isEnabled?: boolean;
  className?: string;
}

/** Picks a model from the ones the agent offers, its own default, or a custom id checked as one safe token. */
export function AgentModelSelect({
  runner,
  value,
  onChange,
  onCommit,
  isEnabled = true,
  className,
}: iAgentModelSelectProps) {
  const { list, isLoading, isRefreshing, refresh } = useAgentModels(runner, isEnabled);
  const [isCustomPicked, setIsCustomPicked] = useState<boolean>();
  const model = value.trim();
  const isListed = list?.models.some((option) => option.id === model) ?? true;
  const isCustom = isCustomPicked ?? (model !== '' && !isListed);
  const isValid = model === '' || isSafeAgentModel(model);
  const label = DIGEST_RUNNER_LABELS(runner);
  const defaultLabel = list?.defaultModel ? `Agent default (${list.defaultModel})` : 'Agent default';
  let selected: string = AGENT_MODEL_PICKS.AGENT_DEFAULT;
  if (isCustom) selected = AGENT_MODEL_PICKS.CUSTOM;
  else if (model !== '') selected = `${LISTED_PREFIX}${model}`;

  const pick = (option: string) => {
    if (option === AGENT_MODEL_PICKS.CUSTOM) {
      setIsCustomPicked(true);
      return;
    }
    setIsCustomPicked(false);
    const next = option.startsWith(LISTED_PREFIX) ? option.slice(LISTED_PREFIX.length) : '';
    onChange(next);
    onCommit?.(next);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <SelectInput
          aria-label={`${label} model`}
          value={selected}
          disabled={isLoading}
          className="w-full max-w-[360px] font-mono text-[12.5px]"
          onChange={(event) => pick(event.target.value)}
        >
          <option value={AGENT_MODEL_PICKS.AGENT_DEFAULT}>{defaultLabel}</option>
          {/* Shown while the list loads, so a saved model is not mistaken for a custom one. */}
          {!list && model !== '' ? <option value={`${LISTED_PREFIX}${model}`}>{model}</option> : null}
          {list?.models.map((option) => (
            <option key={option.id} value={`${LISTED_PREFIX}${option.id}`}>
              {option.label ? `${option.id} - ${option.label}` : option.id}
            </option>
          ))}
          <option value={AGENT_MODEL_PICKS.CUSTOM}>Custom...</option>
        </SelectInput>
        <Button
          variant="ghost"
          size="sm"
          disabled={!isEnabled || isRefreshing}
          title={`Ask ${label} for its models again`}
          onClick={refresh}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      {isCustom ? (
        <TextInput
          aria-label={`${label} custom model`}
          aria-invalid={!isValid}
          value={value}
          maxLength={MAX_AGENT_MODEL_LENGTH}
          placeholder={`Model id, for example ${DIGEST_RUNNER_MODEL_EXAMPLES(runner)}`}
          spellCheck={false}
          autoComplete="off"
          className="mt-1.5 max-w-[360px] font-mono text-[12.5px]"
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (isValid) onCommit?.(model);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      ) : null}
      {isCustom && !isValid ? (
        <p className="m-0 mt-1 text-[12px] text-bad">One model id, with no spaces, that does not start with a dash.</p>
      ) : null}
      {list?.reason ? (
        <p className="m-0 mt-1 text-[12px] text-warn">Showing Chaff&apos;s built-in list: {list.reason}.</p>
      ) : null}
    </div>
  );
}
