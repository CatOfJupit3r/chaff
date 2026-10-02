import { useState } from 'react';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNER_PROVIDERS } from '@chaff/common/enums/digest.enums';
import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';
import { FINDING_TASK_STATES } from '@chaff/common/enums/review.enums';

import { SparkIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Pill } from '@~/components/ui/pill';
import { useSettings } from '@~/features/settings/hooks/use-settings';

import type { iFinding } from '../findings.types';
import { useFindingTask } from '../hooks/use-finding-task';
import { FindingTaskEditor } from './finding-task-editor';

/**
 * The finding restated as one task for a coding agent: suggested by the agent picked in Settings, then
 * accepted as written or edited, or discarded. Only an accepted task goes into exports.
 */
export function FindingTaskSection({ finding }: { finding: iFinding }) {
  const { digestRunner } = useSettings();
  const actions = useFindingTask();
  const [isEditing, setIsEditing] = useState(false);
  const { task } = finding;
  const findingId = finding.id;
  const suggest = () => actions.suggest.mutate({ findingId });
  const discard = () => actions.discard.mutate({ findingId });
  const accept = (text: string, verify: string) =>
    actions.accept.mutate({ findingId, task: text, verify }, { onSuccess: () => setIsEditing(false) });
  const isAccepted = task?.state === FINDING_TASK_STATES.ACCEPTED;

  return (
    <section className="flex flex-col gap-2.5 border-t border-line px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <b className="font-medium text-fg">Suggested task</b>
        {isAccepted ? <Pill variant="ok">Accepted</Pill> : null}
        {task?.state === FINDING_TASK_STATES.PROPOSED ? <Pill variant="fix">Waiting for you</Pill> : null}
        <span className="ml-auto flex gap-1.5">
          {task && task.state !== FINDING_TASK_STATES.WRITING ? (
            <Button variant="ghost" size="sm" disabled={actions.isBusy} onClick={suggest}>
              <SparkIcon />
              Suggest again
            </Button>
          ) : null}
          {task ? (
            <Button variant="ghost" size="sm" disabled={actions.isBusy} onClick={discard}>
              Discard
            </Button>
          ) : null}
        </span>
      </div>
      {task ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={actions.isBusy} data-onboarding={ONBOARDING_ITEMS.FINDINGS} onClick={suggest}>
            <SparkIcon />
            Suggest a task
          </Button>
          <span className="text-[12px] text-faint">
            {DIGEST_RUNNER_LABELS(digestRunner)} restates your comment for a coding agent, no wider than you wrote it.
            The comment and quoted code go to {DIGEST_RUNNER_PROVIDERS(digestRunner)}.
          </span>
        </div>
      )}
      {task?.state === FINDING_TASK_STATES.WRITING ? (
        <p className="m-0 text-[13px] text-muted">{DIGEST_RUNNER_LABELS(task.runner)} is writing the task…</p>
      ) : null}
      {task?.state === FINDING_TASK_STATES.FAILED ? (
        <p className="m-0 text-[13px] text-bad">Could not write a task: {task.error}</p>
      ) : null}
      {task?.state === FINDING_TASK_STATES.PROPOSED || (isAccepted && isEditing) ? (
        <FindingTaskEditor
          key={`${findingId}:${String(task?.updatedAt)}`}
          task={task?.task ?? ''}
          verify={task?.verify ?? ''}
          isBusy={actions.isBusy}
          onAccept={accept}
          onCancel={isEditing ? () => setIsEditing(false) : undefined}
        />
      ) : null}
      {isAccepted && !isEditing ? (
        <button
          type="button"
          title="Edit the task"
          onClick={() => setIsEditing(true)}
          className="flex flex-col gap-1 rounded-sm border border-line bg-canvas px-3 py-2 text-left hover:border-line-strong"
        >
          <span className="text-[13.5px] whitespace-pre-wrap text-fg">{task.task}</span>
          {task.verify ? <span className="text-[12.5px] text-muted">Verify: {task.verify}</span> : null}
        </button>
      ) : null}
    </section>
  );
}
