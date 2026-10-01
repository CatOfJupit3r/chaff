import type { ReactNode } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';

import { CheckIcon, ClockIcon, MessageIcon, NextIcon, QuestionIcon } from '@~/components/icons/icons';
import { Kbd } from '@~/components/ui/kbd';
import { cn } from '@~/lib/utils';

import type { CommentMark } from '../hooks/use-focus-review';
import { NoteComposer } from './note-composer';

interface iDecisionDockProps {
  mark?: UnitMark;
  noteMark?: CommentMark;
  headSha: string;
  isSaving: boolean;
  onComment: (mark: CommentMark) => void;
  onCancelNote: () => void;
  onSaveNote: (mark: CommentMark, body: string) => Promise<boolean>;
  onLooksGood: () => void;
  onLater: () => void;
}

const ACTION_CLASS =
  'flex h-[42px] items-center justify-center gap-2 rounded-[10px] border px-2.5 font-medium whitespace-nowrap transition-colors [&_svg]:size-4';

function GroupHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-2 overflow-hidden text-[11.5px] whitespace-nowrap text-faint">
      <b className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase">{title}</b>
      <small>{hint}</small>
    </div>
  );
}

/**
 * Fixed under the card so it never moves. Comment actions are dashed because they open a note first;
 * resolving actions are solid with an arrow because they close the card.
 */
export function DecisionDock({
  mark,
  noteMark,
  headSha,
  isSaving,
  onComment,
  onCancelNote,
  onSaveNote,
  onLooksGood,
  onLater,
}: iDecisionDockProps) {
  const isPressed = (candidate: UnitMark) => noteMark === candidate || (!noteMark && mark === candidate);
  const commentButton = (candidate: CommentMark, icon: ReactNode, label: string, key: string) => (
    <button
      type="button"
      aria-pressed={isPressed(candidate)}
      onClick={() => onComment(candidate)}
      className={cn(
        ACTION_CLASS,
        'border-dashed border-line-strong bg-transparent text-muted hover:bg-hover hover:text-fg aria-pressed:border-solid',
        candidate === UNIT_MARKS.CONCERN
          ? 'hover:border-warn-line hover:text-warn aria-pressed:border-warn-line aria-pressed:bg-warn-soft aria-pressed:text-warn'
          : 'hover:border-accent-line hover:text-accent aria-pressed:border-accent-line aria-pressed:bg-accent-soft aria-pressed:text-accent',
      )}
    >
      {icon}
      {label}
      <Kbd>{key}</Kbd>
    </button>
  );

  return (
    <div className="relative z-4 flex flex-none justify-center border-t border-line bg-canvas px-6 pt-2.5 pb-3">
      <div className="relative w-full max-w-[920px]">
        <NoteComposer
          mark={noteMark}
          headSha={headSha}
          isSaving={isSaving}
          onCancel={onCancelNote}
          onSave={onSaveNote}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] items-end gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <GroupHeading title="Comment" hint="write a note first" />
            <div className="grid grid-cols-2 gap-2">
              {commentButton(UNIT_MARKS.CONCERN, <MessageIcon />, 'Concern…', 'C')}
              {commentButton(UNIT_MARKS.QUESTION, <QuestionIcon />, 'Question…', 'Q')}
            </div>
          </div>
          <div aria-hidden="true" className="self-stretch bg-line" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <GroupHeading title="Resolve" hint="close this card and move on" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={isPressed(UNIT_MARKS.LATER)}
                onClick={onLater}
                className={cn(
                  ACTION_CLASS,
                  'border-line-strong bg-raised text-fg hover:bg-hover aria-pressed:border-fg',
                )}
              >
                <ClockIcon />
                Later
                <Kbd>L</Kbd>
                <NextIcon className="size-3.5! text-faint" />
              </button>
              <button
                type="button"
                aria-pressed={isPressed(UNIT_MARKS.LOOKS_GOOD)}
                onClick={onLooksGood}
                className={cn(
                  ACTION_CLASS,
                  'border-good-line bg-good-soft text-good hover:border-good aria-pressed:border-good aria-pressed:ring-1 aria-pressed:ring-good aria-pressed:ring-inset',
                )}
              >
                <CheckIcon />
                Looks good
                <Kbd>G</Kbd>
                <NextIcon className="size-3.5!" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
