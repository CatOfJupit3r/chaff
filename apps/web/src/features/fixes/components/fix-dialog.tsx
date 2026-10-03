import { useState } from 'react';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_PROVIDERS } from '@chaff/common/enums/digest.enums';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { RunnerPicker } from '@~/features/digests/components/runner-picker';
import { useRunnerChoice } from '@~/features/digests/hooks/use-runner-choice';
import { useFindings } from '@~/features/findings/hooks/use-findings';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';

import { findingLabels, fixableFindings } from '../fixes.utils';
import { useFixActions } from '../hooks/use-fix-actions';

/**
 * Hands the review's open concerns and questions to a coding agent that may edit files. It is its own
 * action with its own confirmation: the agent works in a new checkout on a branch of Chaff's store.
 */
export function FixWithAgentButton({ snapshot }: { snapshot: iSnapshot }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { runners, isPending, runner, setPicked, isRunnerAvailable } = useRunnerChoice(isOpen);
  const findings = fixableFindings(useFindings(snapshot.targetId), snapshot.targetId);
  const actions = useFixActions(snapshot.id);
  const close = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen);
    if (!isNowOpen) setIsConfirmed(false);
  };

  return (
    <>
      <Button disabled={findings.length === 0} onClick={() => setIsOpen(true)}>
        Fix with agent
      </Button>
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="w-[min(560px,100%)]">
          <DialogHeader
            title={`Hand ${pluralize(findings.length, 'finding')} to an agent?`}
            description={`${findingLabels(findings.map((finding) => finding.number))}: the open concerns and questions of this review. The agent gets the Markdown packet as its prompt.`}
          />
          <DialogBody>
            <RunnerPicker runners={runners} isPending={isPending} runner={runner} onPick={setPicked} />
            <Callout variant="warn">
              Unlike a digest, {DIGEST_RUNNER_LABELS(runner)} can edit files here. It works in a new checkout of the
              newest snapshot of {snapshot.branch}, on a new branch in Chaff&apos;s own store, and sends what it reads
              to {DIGEST_RUNNER_PROVIDERS(runner)}. Your repository and your branch are not touched; you bring the fix
              over yourself if you want it.
            </Callout>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={() => setIsConfirmed(!isConfirmed)}
                className="size-3.5 accent-accent"
              />
              Let the agent edit files in that checkout
            </label>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button
                variant="primary"
                disabled={!isConfirmed || !isRunnerAvailable || actions.isStarting}
                onClick={() => actions.start(runner, () => close(false))}
              >
                {actions.isStarting ? 'Starting...' : 'Start fix'}
              </Button>
            </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
