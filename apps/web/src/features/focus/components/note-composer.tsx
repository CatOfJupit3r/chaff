import { useEffect, useRef, useState } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { AlertIcon, QuestionIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { Pill } from '@~/components/ui/pill';
import { cn } from '@~/lib/utils';

import type { CommentMark } from '../hooks/use-focus-review';

interface iNoteComposerProps {
  mark?: CommentMark;
  headSha: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (mark: CommentMark, body: string) => Promise<boolean>;
}

/** Floats above the decision dock: Enter saves and moves on, Shift+Enter adds a line, Escape cancels. */
export function NoteComposer({ mark, headSha, isSaving, onCancel, onSave }: iNoteComposerProps) {
  const [body, setBody] = useState('');
  const [isEmptyWarning, setIsEmptyWarning] = useState(false);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const isConcern = mark === UNIT_MARKS.CONCERN;

  useEffect(() => {
    if (mark) textArea.current?.focus();
  }, [mark]);

  const save = async () => {
    if (!mark || isSaving) return;
    if (body.trim().length === 0) {
      setIsEmptyWarning(true);
      return;
    }
    if (await onSave(mark, body)) setBody('');
  };

  return (
    <div
      role="dialog"
      aria-label="Write a note"
      aria-hidden={!mark}
      className={cn(
        'absolute inset-x-0 bottom-[calc(100%+22px)] flex flex-col gap-2.5 rounded-xl border bg-surface px-4 py-3.5 shadow-modal transition-[opacity,translate] duration-150',
        isConcern ? 'border-warn-line' : 'border-accent-line',
        mark ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1.5 opacity-0',
      )}
    >
      <div className="flex min-h-[22px] items-center gap-2 text-[12.5px] text-muted">
        {isConcern ? (
          <Pill variant="open">
            <AlertIcon className="size-3" />
            Concern
          </Pill>
        ) : (
          <Pill variant="question">
            <QuestionIcon className="size-3" />
            Question
          </Pill>
        )}
        {isConcern ? 'What should change?' : 'What do you need to understand?'}
        {isEmptyWarning ? <span className="ml-auto text-warn">Write a few words first</span> : null}
      </div>
      <textarea
        ref={textArea}
        value={body}
        tabIndex={mark ? 0 : -1}
        placeholder="One line is enough. Enter saves, Shift+Enter for a new line."
        onChange={(event) => {
          setBody(event.target.value);
          setIsEmptyWarning(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            save().catch(() => undefined);
          }
        }}
        className="h-[76px] w-full resize-none rounded-sm border border-line-strong bg-canvas px-3 py-2.5 text-[13.5px] leading-normal text-fg"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[12px] text-faint">
          Pinned to {headSha.slice(0, 7)} with the quoted lines, so it survives rebases.
        </span>
        <Button variant="ghost" size="sm" tabIndex={mark ? 0 : -1} onClick={onCancel}>
          Cancel <Kbd>Esc</Kbd>
        </Button>
        <Button
          variant="primary"
          size="sm"
          tabIndex={mark ? 0 : -1}
          disabled={isSaving}
          onClick={async () => save().catch(() => undefined)}
        >
          Save and next <Kbd className="border-current/30 bg-transparent text-inherit">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
