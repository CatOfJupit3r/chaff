import { useState } from 'react';

import {
  DIGEST_RUNNER_COMMANDS,
  DIGEST_RUNNER_LABELS,
  DIGEST_RUNNER_PROVIDERS,
} from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Button } from '@~/components/ui/button';
import { ListRow } from '@~/components/ui/list';
import { Pill } from '@~/components/ui/pill';
import { TextInput } from '@~/components/ui/text-input';
import type { iDigestRunnerStatus } from '@~/features/digests/digests.types';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';

interface iAgentRowProps {
  runner: DigestRunner;
  status: iDigestRunnerStatus | undefined;
}

function AgentStatus({ status }: { status: iDigestRunnerStatus | undefined }) {
  if (!status) return <span className="text-[12px] text-muted">Looking for it...</span>;
  if (!status.isAvailable) {
    return <span className="truncate text-[12px] text-warn">Not found: {status.command}</span>;
  }
  return <span className="truncate font-mono text-[11.5px] text-faint">{status.path}</span>;
}

/** One coding agent: where Chaff finds it, an optional command or path, and whether it is the default. */
export function AgentRow({ runner, status }: iAgentRowProps) {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const saved = settings.agentCommands.find((candidate) => candidate.runner === runner)?.command ?? '';
  const [draft, setDraft] = useState(saved);
  const isDefault = settings.digestRunner === runner;

  const save = () => {
    const command = draft.trim();
    if (command === saved) return;
    const others = settings.agentCommands.filter((candidate) => candidate.runner !== runner);
    updateSettings.mutate({ agentCommands: command ? [...others, { runner, command }] : others });
  };

  return (
    <ListRow className="items-start">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center gap-2">
          <b className="text-[13px] font-medium text-fg">{DIGEST_RUNNER_LABELS.get(runner)}</b>
          <span className="text-[12px] text-muted">{DIGEST_RUNNER_PROVIDERS.get(runner)}</span>
          {isDefault ? <Pill>Default</Pill> : null}
        </div>
        <TextInput
          aria-label={`${DIGEST_RUNNER_LABELS.get(runner)} command`}
          value={draft}
          placeholder={`${DIGEST_RUNNER_COMMANDS.get(runner)} (found on PATH)`}
          spellCheck={false}
          className="max-w-[520px] font-mono text-[12.5px]"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        <AgentStatus status={status} />
      </div>
      <Button
        disabled={isDefault || !status?.isAvailable}
        onClick={() => updateSettings.mutate({ digestRunner: runner })}
      >
        Make default
      </Button>
    </ListRow>
  );
}
