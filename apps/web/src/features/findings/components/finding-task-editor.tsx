import { useState } from 'react';

import { Button } from '@~/components/ui/button';
import { TextInput } from '@~/components/ui/text-input';

interface iFindingTaskEditorProps {
  task: string;
  verify: string;
  isBusy: boolean;
  onAccept: (task: string, verify: string) => void;
  onCancel?: () => void;
}

/** The task and how to verify it, editable before the reviewer accepts them. */
export function FindingTaskEditor({ task, verify, isBusy, onAccept, onCancel }: iFindingTaskEditorProps) {
  const [taskDraft, setTaskDraft] = useState(task);
  const [verifyDraft, setVerifyDraft] = useState(verify);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        aria-label="Task"
        value={taskDraft}
        onChange={(event) => setTaskDraft(event.target.value)}
        className="min-h-[64px] w-full resize-y rounded-sm border border-line-strong bg-canvas px-3 py-2 text-[13.5px] leading-normal text-fg outline-none focus:border-accent-line"
      />
      <TextInput
        aria-label="How to verify it"
        placeholder="How to tell it is done (optional)"
        value={verifyDraft}
        onChange={(event) => setVerifyDraft(event.target.value)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          disabled={isBusy || taskDraft.trim() === ''}
          onClick={() => onAccept(taskDraft.trim(), verifyDraft.trim())}
        >
          Accept task
        </Button>
      </div>
    </div>
  );
}
