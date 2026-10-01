import { Pill } from '@~/components/ui/pill';

import { FINDING_KIND_LABELS, FINDING_STATUS_LABELS, FINDING_STATUS_PILLS } from '../findings.enums';
import type { iFinding } from '../findings.types';

/** Status, kind and number of a finding, as shown above its note. */
export function FindingBadges({ finding }: { finding: iFinding }) {
  return (
    <>
      <Pill variant={FINDING_STATUS_PILLS(finding.status)}>{FINDING_STATUS_LABELS(finding.status)}</Pill>
      <span className="font-medium text-fg">{FINDING_KIND_LABELS(finding.kind)}</span>
      <span className="font-mono text-[12px] text-faint">F-{finding.number}</span>
    </>
  );
}
