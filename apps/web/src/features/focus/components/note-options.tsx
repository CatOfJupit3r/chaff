import { useState } from 'react';

import { UNIT_MARKS } from '@chaff/common/enums/review.enums';

import { SegmentedControl } from '@~/components/ui/segmented-control';
import { SeverityPicker } from '@~/features/findings/components/severity-picker';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';

import { NOTE_SCOPE_LABELS, NOTE_SCOPES, noteScopeValues } from '../focus.enums';
import type { NoteScope } from '../focus.enums';
import type { iNoteOptions, NoteMark } from '../hooks/use-focus-review';
import { UnitPickerDialog } from './unit-picker-dialog';

/** The review's units, for notes about units beyond the card. */
export interface iNoteUnitSource {
  units: readonly iUnit[];
  files: readonly iSnapshotFile[];
  cardUnitIds: readonly string[];
}

interface iNoteOptionsProps {
  mark: NoteMark;
  options: iNoteOptions;
  source: iNoteUnitSource;
  isEnabled: boolean;
  onChange: (options: iNoteOptions) => void;
}

const scopeLabel = (scope: NoteScope, options: iNoteOptions) =>
  scope === NOTE_SCOPES.UNITS && options.scope === NOTE_SCOPES.UNITS
    ? `${options.unitIds.length} units…`
    : NOTE_SCOPE_LABELS(scope);

/** What the concern or question is about (this card, picked units, the branch or the stack) and its severity. */
export function NoteOptions({ mark, options, source, isEnabled, onChange }: iNoteOptionsProps) {
  const [isPicking, setIsPicking] = useState(false);
  const choose = (scope: NoteScope) => {
    if (scope === NOTE_SCOPES.UNITS) setIsPicking(true);
    else onChange({ ...options, scope });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" inert={!isEnabled}>
      <SegmentedControl
        label="What the note is about"
        options={noteScopeValues.map((scope) => ({ value: scope, label: scopeLabel(scope, options) }))}
        value={options.scope}
        onChange={choose}
      />
      {mark === UNIT_MARKS.CONCERN ? (
        <SeverityPicker
          severity={options.severity}
          onChange={(severity) => onChange({ ...options, severity })}
          className="ml-auto"
        />
      ) : null}
      <UnitPickerDialog
        isOpen={isPicking}
        onOpenChange={setIsPicking}
        units={source.units}
        files={source.files}
        initialUnitIds={options.scope === NOTE_SCOPES.UNITS ? options.unitIds : source.cardUnitIds}
        onPick={(unitIds) => onChange({ ...options, scope: NOTE_SCOPES.UNITS, unitIds })}
      />
    </div>
  );
}
