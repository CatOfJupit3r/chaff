import { SHORTCUT_ACTIONS } from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutAction } from '@chaff/common/enums/shortcuts.enums';

import { Kbd } from '@~/components/ui/kbd';
import { useShortcutBindings } from '@~/features/settings/hooks/use-shortcut-bindings';
import { shortcutKeyLabel } from '@~/features/settings/shortcuts.utils';

interface iHint {
  keys: string[];
  label: string;
  /** The keys are the two ends of a range. */
  isRange?: boolean;
}

const ACTION_HINTS: [ShortcutAction, string][] = [
  [SHORTCUT_ACTIONS.FOCUS_LOOKS_GOOD, 'looks good'],
  [SHORTCUT_ACTIONS.FOCUS_CONCERN, 'concern'],
  [SHORTCUT_ACTIONS.FOCUS_QUESTION, 'question'],
  [SHORTCUT_ACTIONS.FOCUS_LATER, 'later'],
  [SHORTCUT_ACTIONS.FOCUS_SKIP, 'skip'],
  [SHORTCUT_ACTIONS.FOCUS_UNDO, 'undo'],
];

/** The keys of the Focus screen as set in Settings. */
export function FocusHints() {
  const keys = useShortcutBindings();
  const label = (action: ShortcutAction) => shortcutKeyLabel(keys.get(action) ?? '');
  const hints: iHint[] = [
    { keys: ['←', '→'], label: 'move' },
    ...ACTION_HINTS.map(([action, text]) => ({ keys: [label(action)], label: text })),
    { keys: ['1', '4'], label: 'code, usages, diagram, tests', isRange: true },
    { keys: [label(SHORTCUT_ACTIONS.FOCUS_CONTEXT)], label: 'context' },
  ];

  return (
    <div className="mt-[18px] flex flex-wrap justify-center gap-[18px] text-[12px] text-faint">
      {hints.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          {hint.keys.map((key, index) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              {hint.isRange && index > 0 ? '–' : null}
              <Kbd>{key}</Kbd>
            </span>
          ))}
          {hint.label}
        </span>
      ))}
    </div>
  );
}
