import {
  SHORTCUT_ACTION_SCREENS,
  SHORTCUT_SCREEN_LABELS,
  shortcutActionValues,
  shortcutScreenValues,
} from '@chaff/common/enums/shortcuts.enums';

import { Button } from '@~/components/ui/button';
import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';

import { useSettings } from '../hooks/use-settings';
import { useShortcutBindings } from '../hooks/use-shortcut-bindings';
import { useUpdateSettings } from '../hooks/use-update-settings';
import { rebindShortcut } from '../shortcuts.utils';
import { ShortcutRow } from './shortcut-row';

/** The keyboard map of Focus review and Verify; a key can be used once per screen. */
export function ShortcutsSection() {
  const { shortcuts } = useSettings();
  const keys = useShortcutBindings();
  const updateSettings = useUpdateSettings();

  return (
    <section aria-label="Keyboard" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <SectionLabel>Keyboard</SectionLabel>
        <Button
          variant="ghost"
          size="sm"
          disabled={shortcuts.length === 0}
          onClick={() => updateSettings.mutate({ shortcuts: [] })}
        >
          Reset all
        </Button>
      </div>
      <p className="m-0 text-[12.5px] text-muted">
        Click a key and press the one you want. Arrows always move, and 1 to 4 switch the card&apos;s views in Focus.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {shortcutScreenValues.map((screen) => (
          <div key={screen} className="flex flex-col gap-2">
            <span className="text-[12.5px] font-medium text-fg-soft">{SHORTCUT_SCREEN_LABELS(screen)}</span>
            <List>
              {shortcutActionValues
                .filter((action) => SHORTCUT_ACTION_SCREENS(action) === screen)
                .map((action) => (
                  <ShortcutRow
                    key={action}
                    action={action}
                    keys={keys}
                    isCustom={shortcuts.some((binding) => binding.action === action)}
                    onChange={(key) => updateSettings.mutate({ shortcuts: rebindShortcut(shortcuts, action, key) })}
                  />
                ))}
            </List>
          </div>
        ))}
      </div>
    </section>
  );
}
