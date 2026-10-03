import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_PROVIDERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Field } from '@~/components/ui/field';
import { cn } from '@~/lib/utils';

import type { iDigestRunnerStatus } from '../digests.types';

interface iRunnerPickerProps {
  runners: iDigestRunnerStatus[];
  isPending: boolean;
  runner: DigestRunner;
  onPick: (runner: DigestRunner) => void;
}

/** The coding agents on this computer, with where each was found; missing ones can't be picked. */
export function RunnerPicker({ runners, isPending, runner, onPick }: iRunnerPickerProps) {
  return (
    <Field label="Agent">
      <div role="radiogroup" aria-label="Agent" className="flex flex-col gap-1.5">
        {runners.map((candidate) => (
          <button
            key={candidate.runner}
            type="button"
            role="radio"
            aria-checked={candidate.runner === runner}
            disabled={!candidate.isAvailable}
            onClick={() => onPick(candidate.runner)}
            className={cn(
              'flex items-center gap-3 rounded-md border border-line px-3 py-2.5 text-left hover:bg-hover',
              'disabled:pointer-events-none disabled:opacity-55 aria-checked:border-accent-line aria-checked:bg-accent-soft',
            )}
          >
            <span className="text-[13px] font-medium text-fg">{DIGEST_RUNNER_LABELS.get(candidate.runner)}</span>
            <span className="text-[12px] text-muted">{DIGEST_RUNNER_PROVIDERS.get(candidate.runner)}</span>
            <span className="ml-auto truncate font-mono text-[11.5px] text-faint">
              {candidate.isAvailable ? candidate.path : 'not found on this computer'}
            </span>
          </button>
        ))}
        {isPending ? <span className="text-[12.5px] text-muted">Looking for installed agents...</span> : null}
      </div>
    </Field>
  );
}
