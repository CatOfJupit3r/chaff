import { NAVIGATOR_WIDTH } from '@chaff/common/constants/layout.constants';
import {
  DIFF_CONTEXT_LABELS,
  DIFF_LAYOUT_LABELS,
  diffContextValues,
  diffLayoutValues,
  INLINE_DIFF_LABELS,
  inlineDiffValues,
} from '@chaff/common/enums/diff.enums';
import { reviewProgressionValues } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { Field } from '@~/components/ui/field';
import { SectionLabel } from '@~/components/ui/section-label';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { REVIEW_PROGRESSION_LABELS } from '@~/features/focus/focus.enums';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';
import {
  CONTEXT_PANEL_CHOICE_LABELS,
  CONTEXT_PANEL_CHOICES,
  contextPanelChoiceValues,
  WHITESPACE_CHOICE_LABELS,
  WHITESPACE_CHOICES,
  whitespaceChoiceValues,
} from '../settings.enums';

const optionsOf = <TValue extends string>(values: readonly TValue[], label: (value: TValue) => string) =>
  values.map((value) => ({ value, label: label(value) }));

/** How diffs open and read, and how the review screens are laid out. */
export function DiffLayoutSection() {
  const settings = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  return (
    <section aria-label="Diffs and layout" className="flex flex-col gap-2.5">
      <SectionLabel>Diffs and layout</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-8 gap-y-5 rounded-lg border border-line bg-surface p-5">
        <Field label="Full diff opens in">
          <SegmentedControl
            label="Full diff opens in"
            options={optionsOf(diffLayoutValues, DIFF_LAYOUT_LABELS)}
            value={settings.diffLayout}
            onChange={(diffLayout) => updateSettings({ diffLayout })}
          />
        </Field>
        <Field label="Context around changes">
          <SegmentedControl
            label="Context around changes"
            options={optionsOf(diffContextValues, DIFF_CONTEXT_LABELS)}
            value={settings.diffContext}
            onChange={(diffContext) => updateSettings({ diffContext })}
          />
        </Field>
        <Field label="Whitespace-only changes" hint="Ignored changes still count toward the review.">
          <SegmentedControl
            label="Whitespace-only changes"
            options={optionsOf(whitespaceChoiceValues, WHITESPACE_CHOICE_LABELS)}
            value={settings.isWhitespaceIgnored ? WHITESPACE_CHOICES.IGNORE : WHITESPACE_CHOICES.SHOW}
            onChange={(choice) => updateSettings({ isWhitespaceIgnored: choice === WHITESPACE_CHOICES.IGNORE })}
          />
        </Field>
        <Field label="Changes inside a line">
          <SegmentedControl
            label="Changes inside a line"
            options={optionsOf(inlineDiffValues, INLINE_DIFF_LABELS)}
            value={settings.inlineDiff}
            onChange={(inlineDiff) => updateSettings({ inlineDiff })}
          />
        </Field>
        <Field label="Focus starts with">
          <SegmentedControl
            label="Focus starts with"
            options={optionsOf(reviewProgressionValues, REVIEW_PROGRESSION_LABELS)}
            value={settings.defaultProgression}
            onChange={(defaultProgression) => updateSettings({ defaultProgression })}
          />
        </Field>
        <Field label="Focus context panel">
          <SegmentedControl
            label="Focus context panel"
            options={optionsOf(contextPanelChoiceValues, CONTEXT_PANEL_CHOICE_LABELS)}
            value={settings.isContextPanelPinned ? CONTEXT_PANEL_CHOICES.PINNED : CONTEXT_PANEL_CHOICES.ON_DEMAND}
            onChange={(choice) => updateSettings({ isContextPanelPinned: choice === CONTEXT_PANEL_CHOICES.PINNED })}
          />
        </Field>
        <Field label="File list width" hint="Drag the edge of the Full diff's file list to change it.">
          <span className="flex items-center gap-3 text-[13px] text-fg">
            {settings.navigatorWidth}px
            {settings.navigatorWidth === NAVIGATOR_WIDTH.default ? null : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ navigatorWidth: NAVIGATOR_WIDTH.default })}
              >
                Reset
              </Button>
            )}
          </span>
        </Field>
      </div>
    </section>
  );
}
