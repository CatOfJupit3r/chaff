import { useState } from 'react';

import { REPORT_SKIP_REASONS, reportSkipReasonsEnumwaii } from '@chaff/common/enums/export.enums';
import { FINDING_STATUS_LABELS } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iReportResult } from '../exports.types';
import { useImportReport } from '../hooks/use-import-report';

const SKIP_REASON_LABELS = reportSkipReasonsEnumwaii.derive({
  [REPORT_SKIP_REASONS.UNSUPPORTED_STATUS]: 'the status is not fix_proposed or answered',
  [REPORT_SKIP_REASONS.WRONG_KIND]: 'fixes are for concerns, answers for questions',
  [REPORT_SKIP_REASONS.NOT_ACTIVE]: 'it is verified, closed or withdrawn',
  [REPORT_SKIP_REASONS.ALREADY_SET]: 'it already has that status',
  [REPORT_SKIP_REASONS.MISSING_NOTE]: 'an answer needs a note',
});

function ReportResult({ result }: { result: iReportResult }) {
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {result.applied.map((item) => (
        <p key={item.findingId} className="m-0 text-fg">
          <span className="font-mono text-muted">F-{item.number}</span> is now {FINDING_STATUS_LABELS(item.status)}
        </p>
      ))}
      {result.skipped.map((item) => (
        <p key={`${item.findingId}-${item.reason}`} className="m-0 text-muted">
          <span className="font-mono">F-{item.number}</span> left as it was: {SKIP_REASON_LABELS(item.reason)}
        </p>
      ))}
      {result.unknown.length > 0 ? (
        <Callout variant="warn">No finding in this repository has the id {result.unknown.join(', ')}.</Callout>
      ) : null}
      {result.applied.length === 0 && result.skipped.length === 0 && result.unknown.length === 0 ? (
        <p className="m-0 text-muted">The report lists no findings.</p>
      ) : null}
    </div>
  );
}

/** Paste a coding agent's reply; the findings it reports on move to Fix proposed or Answered. */
export function ImportReportDialog({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState('');
  const importReport = useImportReport();
  const close = (isNowOpen: boolean) => {
    setIsOpen(isNowOpen);
    if (!isNowOpen) {
      setReport('');
      importReport.reset();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Import agent report</Button>
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="w-[min(640px,100%)]">
          <DialogHeader
            title="Import an agent report"
            description="Paste the agent's reply or its JSON report. Findings it fixed wait for you on the Findings screen; nothing is verified for you."
          />
          <DialogBody>
            <textarea
              aria-label="Agent report"
              value={report}
              onChange={(event) => setReport(event.target.value)}
              placeholder='[{ "id": "F-12", "status": "fix_proposed", "note": "...", "commits": ["..."] }]'
              className="min-h-[180px] w-full resize-y rounded-sm border border-line-strong bg-canvas px-3 py-2 font-mono text-code text-fg outline-none placeholder:text-faint focus:border-accent-line"
            />
            {importReport.error ? <Callout variant="warn">{getErrorMessage(importReport.error)}</Callout> : null}
            {importReport.data ? <ReportResult result={importReport.data} /> : null}
            <DialogFooter>
              <DialogClose render={<Button />}>Close</DialogClose>
              <Button
                variant="primary"
                disabled={!report.trim() || importReport.isPending}
                onClick={() => importReport.mutate({ workspaceId, report })}
              >
                {importReport.isPending ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
