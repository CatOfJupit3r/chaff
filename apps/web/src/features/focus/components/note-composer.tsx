import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { AlertIcon, QuestionIcon, SkipIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { Pill } from '@~/components/ui/pill';
import { cn } from '@~/lib/utils';

import { NOTE_SCOPE_FOOTERS, NOTE_SCOPES } from '../focus.enums';
import { CARD_NOTE } from '../hooks/use-focus-review';
import type { iNoteOptions, NoteMark } from '../hooks/use-focus-review';
import { NoteOptions } from './note-options';
import type { iNoteUnitSource } from './note-options';

interface iNoteComposerProps {
  mark?: NoteMark;
  headSha: string;
  isSaving: boolean;
  source: iNoteUnitSource;
  onCancel: () => void;
  onSave: (mark: NoteMark, body: string, options: iNoteOptions) => Promise<boolean>;
}

interface iNoteStyle {
  pill: ReactNode;
  prompt: string;
  border: string;
  footer: (headSha: string) => string;
  save: string;
}

const NOTE_STYLES = new Map<NoteMark | undefined, iNoteStyle>([
  [
    UNIT_MARKS.CONCERN,
    {
      pill: (
        <Pill variant="open">
          <AlertIcon className="size-3" />
          Concern
        </Pill>
      ),
      prompt: 'What should change?',
      border: 'border-warn-line',
      footer: (headSha) => `Pinned to ${headSha.slice(0, 7)} with the quoted lines, so it survives rebases.`,
      save: 'Save and next',
    },
  ],
  [
    UNIT_MARKS.SKIPPED,
    {
      pill: (
        <Pill variant="out">
          <SkipIcon className="size-3" />
          Skip
        </Pill>
      ),
      prompt: 'Why is it safe not to read this?',
      border: 'border-line-strong',
      footer: () => 'Skipping is not approval. The reason shows on the card and in exports.',
      save: 'Skip and next',
    },
  ],
]);

const QUESTION_STYLE: iNoteStyle = {
  pill: (
    <Pill variant="question">
      <QuestionIcon className="size-3" />
      Question
    </Pill>
  ),
  prompt: 'What do you need to understand?',
  border: 'border-accent-line',
  footer: (headSha) => `Pinned to ${headSha.slice(0, 7)} with the quoted lines, so it survives rebases.`,
  save: 'Save and next',
};

/** Floats above the decision dock: Enter saves and moves on, Shift+Enter adds a line, Escape cancels. */
export function NoteComposer({ mark, headSha, isSaving, source, onCancel, onSave }: iNoteComposerProps) {
  const [body, setBody] = useState('');
  const [isEmptyWarning, setIsEmptyWarning] = useState(false);
  const [options, setOptions] = useState(CARD_NOTE);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const style = NOTE_STYLES.get(mark) ?? QUESTION_STYLE;
  const isSkip = mark === UNIT_MARKS.SKIPPED;
  const scopeFooter = isSkip ? undefined : NOTE_SCOPE_FOOTERS.get(options.scope);
  const isCardCovered =
    isSkip ||
    options.scope === NOTE_SCOPES.CARD ||
    (options.scope === NOTE_SCOPES.UNITS && source.cardUnitIds.every((unitId) => options.unitIds.includes(unitId)));

  useEffect(() => {
    if (mark) textArea.current?.focus();
  }, [mark]);

  const save = async () => {
    if (!mark || isSaving) return;
    if (body.trim().length === 0) {
      setIsEmptyWarning(true);
      return;
    }
    if (await onSave(mark, body, options)) {
      setBody('');
      setOptions(CARD_NOTE);
    }
  };
  const cancel = () => {
    setOptions(CARD_NOTE);
    onCancel();
  };

  return (
    <div
      role="dialog"
      aria-label="Write a note"
      aria-hidden={!mark}
      className={cn(
        'absolute inset-x-0 bottom-[calc(100%+22px)] flex flex-col gap-2.5 rounded-xl border bg-surface px-4 py-3.5 shadow-modal transition-[opacity,translate] duration-150',
        style.border,
        mark ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1.5 opacity-0',
      )}
    >
      <div className="flex min-h-[22px] items-center gap-2 text-[12.5px] text-muted">
        {style.pill}
        {style.prompt}
        {isEmptyWarning ? <span className="ml-auto text-warn">Write a few words first</span> : null}
      </div>
      <textarea
        ref={textArea}
        value={body}
        tabIndex={mark ? 0 : -1}
        placeholder={
          mark === UNIT_MARKS.SKIPPED
            ? 'For example: lockfile, generated, vendored. Enter skips.'
            : 'One line is enough. Enter saves, Shift+Enter for a new line.'
        }
        onChange={(event) => {
          setBody(event.target.value);
          setIsEmptyWarning(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          } else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            save().catch(() => undefined);
          }
        }}
        className="h-[76px] w-full resize-none rounded-sm border border-line-strong bg-canvas px-3 py-2.5 text-[13.5px] leading-normal text-fg"
      />
      {mark && !isSkip ? (
        <NoteOptions mark={mark} options={options} source={source} isEnabled={!isSaving} onChange={setOptions} />
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-[12px] text-faint">{scopeFooter ?? style.footer(headSha)}</span>
        <Button variant="ghost" size="sm" tabIndex={mark ? 0 : -1} onClick={cancel}>
          Cancel <Kbd>Esc</Kbd>
        </Button>
        <Button
          variant="primary"
          size="sm"
          tabIndex={mark ? 0 : -1}
          disabled={isSaving}
          onClick={async () => save().catch(() => undefined)}
        >
          {isCardCovered ? style.save : 'Save'} <Kbd className="border-current/30 bg-transparent text-inherit">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
