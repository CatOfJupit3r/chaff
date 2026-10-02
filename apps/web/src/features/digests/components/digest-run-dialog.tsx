import { useState } from 'react';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_PROVIDERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { Field } from '@~/components/ui/field';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { cn } from '@~/lib/utils';

import { useDigestRunners } from '../hooks/use-digest-runners';

interface iDigestRunDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStart: (runner: DigestRunner) => void;
}

/** Picks the coding agent and says plainly what it will see before anything runs. */
export function DigestRunDialog({ isOpen, onOpenChange, onStart }: iDigestRunDialogProps) {
  const { digestRunner } = useSettings();
  const [picked, setPicked] = useState<DigestRunner>();
  const { data: runners, isPending } = useDigestRunners(isOpen);
  const firstAvailable = runners?.find((runner) => runner.isAvailable)?.runner;
  const isDefaultAvailable = runners?.some((runner) => runner.runner === digestRunner && runner.isAvailable);
  const runner = picked ?? (isDefaultAvailable ? digestRunner : (firstAvailable ?? digestRunner));
  const isRunnerAvailable = runners?.some((candidate) => candidate.runner === runner && candidate.isAvailable);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Write an AI digest"
          description="A coding agent on this computer reads the branch and suggests groups, a reading order and notes for each unit. You still make every decision."
        />
        <DialogBody>
          <Field label="Agent">
            <div role="radiogroup" aria-label="Agent" className="flex flex-col gap-1.5">
              {(runners ?? []).map((candidate) => (
                <button
                  key={candidate.runner}
                  type="button"
                  role="radio"
                  aria-checked={candidate.runner === runner}
                  disabled={!candidate.isAvailable}
                  onClick={() => setPicked(candidate.runner)}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-line px-3 py-2.5 text-left hover:bg-hover',
                    'disabled:pointer-events-none disabled:opacity-55 aria-checked:border-accent-line aria-checked:bg-accent-soft',
                  )}
                >
                  <span className="text-[13px] font-medium text-fg">{DIGEST_RUNNER_LABELS(candidate.runner)}</span>
                  <span className="text-[12px] text-muted">{DIGEST_RUNNER_PROVIDERS(candidate.runner)}</span>
                  <span className="ml-auto truncate font-mono text-[11.5px] text-faint">
                    {candidate.isAvailable ? candidate.path : 'not found on this computer'}
                  </span>
                </button>
              ))}
              {isPending ? <span className="text-[12.5px] text-muted">Looking for installed agents...</span> : null}
            </div>
          </Field>
          <Callout variant="warn">
            {DIGEST_RUNNER_LABELS(runner)} sends the code it reads from this branch to {DIGEST_RUNNER_PROVIDERS(runner)}
            , under your own account and its settings. It works in a throwaway copy of the snapshot and can only read
            and search files: no edits, no commands, no network tools.
          </Callout>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button
              variant="primary"
              disabled={!isRunnerAvailable}
              onClick={() => {
                onStart(runner);
                onOpenChange(false);
              }}
            >
              Write digest
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
