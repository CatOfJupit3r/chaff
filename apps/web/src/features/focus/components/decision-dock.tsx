import type { ReactNode } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';
import type { UnitMark } from '@chaff/common/enums/review.enums';
import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';

import { CheckIcon, ClockIcon, MessageIcon, NextIcon, QuestionIcon, SkipIcon } from '@~/components/icons/icons';
import { Kbd } from '@~/components/ui/kbd';
import { useShortcutBindings } from '@~/features/settings/hooks/use-shortcut-bindings';
import { shortcutKeyLabel } from '@~/features/settings/shortcuts.utils';
import { cn } from '@~/lib/utils';

import type { iNoteOptions, NoteMark } from '../hooks/use-focus-review';
import { NoteComposer } from './note-composer';
import type { iNoteUnitSource } from './note-options';

interface iDecisionDockProps {
  mark?: UnitMark;
  noteMark?: NoteMark;
  headSha: string;
  isSaving: boolean;
  noteSource: iNoteUnitSource;
  onComment: (mark: NoteMark) => void;
  onCancelNote: () => void;
  onSaveNote: (mark: NoteMark, body: string, options: iNoteOptions) => Promise<boolean>;
  onLooksGood: () => void;
  onLater: () => void;
}

const ACTION_CLASS =
  'flex h-[42px] items-center justify-center gap-2 rounded-[10px] border px-2.5 font-medium whitespace-nowrap transition-colors [&_svg]:size-4';

const COMMENT_BUTTON_CLASSES = new Map<NoteMark, string>([
  [
    UNIT_MARKS.CONCERN,
    'hover:border-warn-line hover:text-warn aria-pressed:border-warn-line aria-pressed:bg-warn-soft aria-pressed:text-warn',
  ],
  [
    UNIT_MARKS.QUESTION,
    'hover:border-accent-line hover:text-accent aria-pressed:border-accent-line aria-pressed:bg-accent-soft aria-pressed:text-accent',
  ],
  [UNIT_MARKS.SKIPPED, 'aria-pressed:border-fg aria-pressed:bg-raised aria-pressed:text-fg'],
]);

function GroupHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-2 overflow-hidden text-[11.5px] whitespace-nowrap text-faint">
      <b className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase">{title}</b>
      <small>{hint}</small>
    </div>
  );
}

/**
 * Fixed under the card so it never moves. Actions that open a note first (Concern, Question, Skip) are dashed;
 * resolving actions are solid with an arrow because they close the card.
 */
export function DecisionDock({
  mark,
  noteMark,
  headSha,
  isSaving,
  noteSource,
  onComment,
  onCancelNote,
  onSaveNote,
  onLooksGood,
  onLater,
}: iDecisionDockProps) {
  const keys = useShortcutBindings();
  const keyFor = (action: ShortcutAction) => shortcutKeyLabel(keys.get(action) ?? '');
  const isPressed = (candidate: UnitMark) => noteMark === candidate || (!noteMark && mark === candidate);
  const commentButton = (candidate: NoteMark, icon: ReactNode, label: string, key: string) => (
    <button
      type="button"
      aria-pressed={isPressed(candidate)}
      onClick={() => onComment(candidate)}
      className={cn(
        ACTION_CLASS,
        'border-dashed border-line-strong bg-transparent text-muted hover:bg-hover hover:text-fg aria-pressed:border-solid',
        COMMENT_BUTTON_CLASSES.get(candidate),
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
          source={noteSource}
          onCancel={onCancelNote}
          onSave={onSaveNote}
        />
        <div className="grid grid-cols-[minmax(0,2fr)_1px_minmax(0,3fr)] items-end gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <GroupHeading title="Comment" hint="write a note first" />
            <div className="grid grid-cols-2 gap-2">
              {commentButton(UNIT_MARKS.CONCERN, <MessageIcon />, 'Concern…', keyFor(SHORTCUT_ACTIONS.FOCUS_CONCERN))}
              {commentButton(
                UNIT_MARKS.QUESTION,
                <QuestionIcon />,
                'Question…',
                keyFor(SHORTCUT_ACTIONS.FOCUS_QUESTION),
              )}
            </div>
          </div>
          <div aria-hidden="true" className="self-stretch bg-line" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <GroupHeading title="Resolve" hint="close this card and move on" />
            <div className="grid grid-cols-3 gap-2">
              {commentButton(UNIT_MARKS.SKIPPED, <SkipIcon />, 'Skip…', keyFor(SHORTCUT_ACTIONS.FOCUS_SKIP))}
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
                <Kbd>{keyFor(SHORTCUT_ACTIONS.FOCUS_LATER)}</Kbd>
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
                <Kbd>{keyFor(SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD)}</Kbd>
                <NextIcon className="size-3.5!" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
