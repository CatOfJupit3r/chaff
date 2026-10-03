import {
  FINDING_KIND_LABELS,
  FINDING_SCOPE_LABELS,
  FINDING_SCOPES,
  FINDING_SEVERITY_LABELS,
  FINDING_STATUS_LABELS,
} from '@chaff/common/enums/review.enums';

import { Pill } from '@~/components/ui/pill';

import { FINDING_SEVERITY_PILLS, FINDING_STATUS_PILLS } from '../findings.enums';
import type { iFinding } from '../findings.types';

/** A concern's severity, when it has one. */
export function SeverityPill({ finding }: { finding: Pick<iFinding, 'severity'> }) {
  if (!finding.severity) return null;
  return (
    <Pill variant={FINDING_SEVERITY_PILLS.get(finding.severity)}>{FINDING_SEVERITY_LABELS.get(finding.severity)}</Pill>
  );
}

/** Status, kind, severity, scope and number of a finding, as shown above its note. */
export function FindingBadges({ finding }: { finding: iFinding }) {
  return (
    <>
      <Pill variant={FINDING_STATUS_PILLS.get(finding.status)}>{FINDING_STATUS_LABELS.get(finding.status)}</Pill>
      <span className="font-medium text-fg">{FINDING_KIND_LABELS.get(finding.kind)}</span>
      <SeverityPill finding={finding} />
      {finding.scope === FINDING_SCOPES.CODE ? null : (
        <Pill variant="neutral">{FINDING_SCOPE_LABELS.get(finding.scope)}</Pill>
      )}
      <span className="font-mono text-[12px] text-faint">F-{finding.number}</span>
    </>
  );
}
