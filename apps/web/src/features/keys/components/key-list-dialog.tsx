import { useState } from 'react';

import {
  SHORTCUT_ACTION_LABELS,
  SHORTCUT_ACTION_SCREENS,
  SHORTCUT_SCREEN_LABELS,
  SHORTCUT_SCREENS,
  shortcutActionValues,
  shortcutScreenValues,
} from '@chaff/common/enums/shortcuts.enums';
import type { ShortcutScreen } from '@chaff/common/enums/shortcuts.enums';

import { Dialog, DialogBody, DialogContent, DialogHeader } from '@~/components/ui/dialog';
import { Kbd } from '@~/components/ui/kbd';
import { SectionLabel } from '@~/components/ui/section-label';
import { useShortcutBindings } from '@~/features/settings/hooks/use-shortcut-bindings';
import { shortcutKeyLabel } from '@~/features/settings/shortcuts.utils';
import { useShortcutKeys } from '@~/hooks/use-shortcut-keys';

interface iKeyRow {
  keys: string[];
  label: string;
}

const EVERYWHERE: iKeyRow[] = [
  { keys: ['/', 'Ctrl K'], label: 'Jump to a unit, file, review or screen' },
  { keys: ['?'], label: 'This list' },
  { keys: ['Esc'], label: 'Close a dialog or the context panel' },
];

const FOCUS_FIXED: iKeyRow[] = [
  { keys: ['←', '→'], label: 'Previous and next card' },
  { keys: ['1', '2', '3', '4'], label: 'Code, usages, diagram, tests' },
];

function KeyRows({ title, rows }: { title: string; rows: readonly iKeyRow[] }) {
  return (
    <section className="flex flex-col gap-1.5">
      <SectionLabel>{title}</SectionLabel>
      <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[13px]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-fg-soft">{row.label}</dt>
            <dd className="m-0 flex justify-end gap-1">
              {row.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Every key Chaff answers to, as bound now; opened with ?. */
export function KeyListDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const keys = useShortcutBindings();
  useShortcutKeys((key) => (key === '?' ? () => setIsOpen(true) : undefined));
  const screenRows = (screen: ShortcutScreen) =>
    shortcutActionValues
      .filter((action) => SHORTCUT_ACTION_SCREENS(action) === screen)
      .map((action) => ({ keys: [shortcutKeyLabel(keys.get(action) ?? '')], label: SHORTCUT_ACTION_LABELS(action) }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[min(560px,100%)]">
        <DialogHeader title="Keyboard" description="Focus and Verify keys can be changed in Settings." />
        <DialogBody className="gap-5">
          <KeyRows title="Everywhere" rows={EVERYWHERE} />
          {shortcutScreenValues.map((screen) => (
            <KeyRows
              key={screen}
              title={SHORTCUT_SCREEN_LABELS(screen)}
              rows={screen === SHORTCUT_SCREENS.FOCUS ? [...FOCUS_FIXED, ...screenRows(screen)] : screenRows(screen)}
            />
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
