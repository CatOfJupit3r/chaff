import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_PROVIDERS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';

import type { iDigestStartOptions } from '../digests.types';
import { useDigestOptions } from '../hooks/use-digest-options';
import { useRunnerChoice } from '../hooks/use-runner-choice';
import { DigestOptionsFields } from './digest-options-fields';
import { RunnerPicker } from './runner-picker';

interface iDigestRunDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStart: (runner: DigestRunner, options: iDigestStartOptions) => void;
}

/** Picks the coding agent, its model and extra instructions, and says plainly what it will see before anything runs. */
export function DigestRunDialog({ isOpen, onOpenChange, onStart }: iDigestRunDialogProps) {
  const { runners, isPending, runner, setPicked, isRunnerAvailable } = useRunnerChoice(isOpen);
  const { options, ...fields } = useDigestOptions(runner, isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Write an AI digest"
          description="A coding agent on this computer reads the branch and suggests groups, a reading order and notes for each unit. You still make every decision."
        />
        <DialogBody>
          <RunnerPicker runners={runners} isPending={isPending} runner={runner} onPick={setPicked} />
          <DigestOptionsFields runner={runner} {...fields} />
          <Callout variant="warn">
            {DIGEST_RUNNER_LABELS.get(runner)} sends the code it reads from this branch to{' '}
            {DIGEST_RUNNER_PROVIDERS.get(runner)}, under your own account and its settings. It works in a throwaway copy
            of the snapshot and can only read and search files: no edits, no commands, no network tools.
          </Callout>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button
              variant="primary"
              disabled={!isRunnerAvailable}
              onClick={() => {
                onStart(runner, options);
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
