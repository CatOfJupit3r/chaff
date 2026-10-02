import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { FINDING_KINDS, FINDING_STATUSES, IS_ACTIVE_FINDING_STATUS } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { manualFindingStatuses } from '@chaff/common/helpers/finding-transitions.helper';

import { showToast } from '@~/components/toast/toast-store';
import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { getErrorMessage } from '@~/utils/rpc-errors';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { FINDING_ACTION_KEYS } from '../findings.enums';
import type { iFinding } from '../findings.types';
import { findingActionLabel } from '../findings.utils';

interface iFindingActionsProps {
  finding: iFinding;
  isPending: boolean;
  onSetStatus: (status: FindingStatus, answer?: string) => void;
}

function AnswerForm({ isPending, onAnswer }: { isPending: boolean; onAnswer: (answer: string) => unknown }) {
  const [answer, setAnswer] = useState('');
  const save = () => {
    if (answer.trim().length > 0) onAnswer(answer.trim());
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor="finding-answer" className="text-[12.5px] text-muted">
        The answer you got, in your words or theirs
      </label>
      <textarea
        id="finding-answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            save();
          }
        }}
        className="h-[68px] w-full resize-none rounded-sm border border-line-strong bg-canvas px-3 py-2.5 text-[13.5px] leading-normal text-fg"
      />
      <Button variant="primary" className="self-start" disabled={isPending || answer.trim() === ''} onClick={save}>
        Save answer
      </Button>
    </div>
  );
}

/** The moves the reviewer can make on the finding now, with their keys; a question can be answered here. */
export function FindingActions({ finding, isPending, onSetStatus }: iFindingActionsProps) {
  const queryClient = useQueryClient();
  const convert = useMutation(
    tanstackRPC.findings.convertToConcern.mutationOptions({
      onSuccess: async () => queryClient.invalidateQueries({ queryKey: tanstackRPC.findings.key() }),
      onError: (error) => showToast(getErrorMessage(error)),
    }),
  );
  const statuses = manualFindingStatuses(finding.kind, finding.status);
  const moves = statuses.filter((status) => status !== FINDING_STATUSES.ANSWERED);
  const isOpenQuestion = finding.kind === FINDING_KINDS.QUESTION && IS_ACTIVE_FINDING_STATUS(finding.status);

  return (
    <footer className="flex flex-col gap-3 border-t border-line px-5 py-3.5">
      {statuses.includes(FINDING_STATUSES.ANSWERED) ? (
        <AnswerForm isPending={isPending} onAnswer={(answer) => onSetStatus(FINDING_STATUSES.ANSWERED, answer)} />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {moves.map((status) => {
          const key = FINDING_ACTION_KEYS(status);
          return (
            <Button
              key={status}
              variant={status === FINDING_STATUSES.VERIFIED ? 'primary' : 'default'}
              disabled={isPending}
              onClick={() => onSetStatus(status)}
            >
              {findingActionLabel(finding.status, status)}
              {key ? <Kbd className="h-4 min-w-4 text-[10px]">{key.toUpperCase()}</Kbd> : null}
            </Button>
          );
        })}
        {isOpenQuestion ? (
          <Button
            variant="ghost"
            disabled={convert.isPending}
            onClick={() => convert.mutate({ findingId: finding.id })}
          >
            Turn into a concern
          </Button>
        ) : null}
        <span className="ml-auto text-[12.5px] text-faint">
          {finding.status === FINDING_STATUSES.VERIFIED
            ? 'Verified by you.'
            : 'Nothing counts as resolved until you verify it.'}
        </span>
      </div>
    </footer>
  );
}
