import type { FindingSeverity } from '@chaff/common/enums/review.enums';

import { SegmentedControl } from '@~/components/ui/segmented-control';

import { SEVERITY_CHOICE_LABELS, severityChoiceValues } from '../findings.enums';
import { choiceFromSeverity, severityFromChoice } from '../findings.utils';

const OPTIONS = severityChoiceValues.map((choice) => ({ value: choice, label: SEVERITY_CHOICE_LABELS.get(choice) }));

interface iSeverityPickerProps {
  severity: FindingSeverity | undefined;
  onChange: (severity: FindingSeverity | undefined) => void;
  className?: string;
}

/** How much a concern matters: no severity, Minor, Major or Blocking. */
export function SeverityPicker({ severity, onChange, className }: iSeverityPickerProps) {
  return (
    <SegmentedControl
      label="Severity"
      options={OPTIONS}
      value={choiceFromSeverity(severity)}
      onChange={(choice) => onChange(severityFromChoice(choice))}
      className={className}
    />
  );
}
