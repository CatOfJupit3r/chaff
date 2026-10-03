import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { Field } from '@~/components/ui/field';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';

import {
  CODE_FONT_OPTIONS,
  CODE_LINE_HEIGHT_OPTIONS,
  CODE_SIZE_OPTIONS,
  DENSITY_OPTIONS,
  SYNTAX_THEME_OPTIONS,
  THEME_MODE_OPTIONS,
} from '../appearance.constants';
import { AccentSwatches } from './accent-swatches';
import { TokenSamples } from './token-samples';

interface iAppearanceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AppearanceDialog({ isOpen, onOpenChange }: iAppearanceDialogProps) {
  const settings = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Appearance"
          description="Saved on this computer. Everything below is driven by theme tokens, so a team can ship its own theme file."
        />
        <DialogBody>
          <Field label="Theme">
            <SegmentedControl
              label="Theme"
              options={THEME_MODE_OPTIONS}
              value={settings.theme}
              onChange={(theme) => updateSettings({ theme })}
            />
          </Field>
          <Field label="Accent">
            <AccentSwatches value={settings.accent} onChange={(accent) => updateSettings({ accent })} />
          </Field>
          <Field label="Density" hint="Compact tightens the spacing everywhere.">
            <SegmentedControl
              label="Density"
              options={DENSITY_OPTIONS}
              value={settings.density}
              onChange={(density) => updateSettings({ density })}
            />
          </Field>
          <Field label="Code font">
            <SegmentedControl
              label="Code font"
              options={CODE_FONT_OPTIONS}
              value={settings.codeFont}
              onChange={(codeFont) => updateSettings({ codeFont })}
            />
          </Field>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <Field label="Code size">
              <SegmentedControl
                label="Code size"
                options={CODE_SIZE_OPTIONS}
                value={settings.codeSize}
                onChange={(codeSize) => updateSettings({ codeSize })}
              />
            </Field>
            <Field label="Line height">
              <SegmentedControl
                label="Line height"
                options={CODE_LINE_HEIGHT_OPTIONS}
                value={settings.codeLineHeight}
                onChange={(codeLineHeight) => updateSettings({ codeLineHeight })}
              />
            </Field>
          </div>
          <Field label="Syntax colors in light mode">
            <SegmentedControl
              label="Syntax colors in light mode"
              options={SYNTAX_THEME_OPTIONS}
              value={settings.syntaxLight}
              onChange={(syntaxLight) => updateSettings({ syntaxLight })}
            />
          </Field>
          <Field label="Syntax colors in dark mode">
            <SegmentedControl
              label="Syntax colors in dark mode"
              options={SYNTAX_THEME_OPTIONS}
              value={settings.syntaxDark}
              onChange={(syntaxDark) => updateSettings({ syntaxDark })}
            />
          </Field>
          <Field
            label="Tokens in use"
            hint="Names follow Tailwind v4, so --color-surface is available as bg-surface and --color-muted as text-muted."
          >
            <TokenSamples />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="primary" />}>Done</DialogClose>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
