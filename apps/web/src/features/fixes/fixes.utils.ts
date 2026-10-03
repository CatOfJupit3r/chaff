import { FINDING_KINDS, FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingKind, FindingStatus } from '@chaff/common/enums/review.enums';

const FIXABLE_KINDS = new Set<FindingKind>([FINDING_KINDS.CONCERN, FINDING_KINDS.QUESTION]);
const FIXABLE_STATUSES = new Set<FindingStatus>([FINDING_STATUSES.OPEN, FINDING_STATUSES.REOPENED]);

/** Findings a hand-off gives the agent: the review's open concerns and questions. */
export function fixableFindings<T extends { kind: FindingKind; status: FindingStatus; targetId: string }>(
  findings: readonly T[],
  targetId: string,
) {
  return findings.filter(
    (finding) =>
      finding.targetId === targetId && FIXABLE_KINDS.has(finding.kind) && FIXABLE_STATUSES.has(finding.status),
  );
}

/** A multi-file unified diff cut into one patch per file, named by the file's new path. */
export function splitPatch(patch: string) {
  const parts = patch.split(/^(?=diff --git )/m).filter((part) => part.startsWith('diff --git '));
  return parts.map((part) => {
    const header = /^diff --git a\/(.+?) b\/(.+)$/m.exec(part);
    return { path: header?.[2] ?? '', patch: part };
  });
}

/** `F-3, F-7` */
export function findingLabels(numbers: readonly number[]) {
  return numbers.map((number) => `F-${number}`).join(', ');
}
