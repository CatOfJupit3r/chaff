import { IMPORTED_ANCHOR_PROBLEM_LABELS } from '@chaff/common/enums/findings-import.enums';
import { FINDING_SCOPES } from '@chaff/common/enums/review.enums';
import { importedAnchorLines } from '@chaff/common/helpers/imported-anchor.helper';

import { importSummaryLine } from '../findings-import.utils';
import type { iFindingsImportResult } from '../findings.types';

/** What an import created and skipped, and each anchor it could not place with the reason. */
export function ImportFindingsSummary({ result }: { result: iFindingsImportResult }) {
  const unresolved = result.created.filter((finding) => finding.unresolvedAnchors.length > 0);

  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <p className="m-0 text-fg">{importSummaryLine(result)}</p>
      {unresolved.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-muted">
            These anchors are not in this snapshot&apos;s diff. They were left out and listed in the finding:
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {unresolved.map((finding) => (
              <li key={finding.findingId} className="flex flex-col gap-0.5">
                <span className="text-fg">
                  <span className="font-mono text-muted">F-{finding.number}</span> {finding.id}
                  {finding.scope === FINDING_SCOPES.BRANCH ? (
                    <span className="text-muted"> · kept for the whole branch</span>
                  ) : null}
                </span>
                {finding.unresolvedAnchors.map((anchor) => (
                  <span key={`${anchor.path}:${anchor.side}:${anchor.startLine}`} className="pl-4 text-muted">
                    <span className="font-mono">{anchor.path}</span> {importedAnchorLines(anchor)}:{' '}
                    {IMPORTED_ANCHOR_PROBLEM_LABELS.get(anchor.problem)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
