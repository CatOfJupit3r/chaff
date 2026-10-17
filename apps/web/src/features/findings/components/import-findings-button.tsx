import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';

import { useImportFindings } from '../hooks/use-import-findings';
import { ImportFindingsSummary } from './import-findings-summary';

/** Imports findings written outside Chaff from a JSON file into the snapshot, then says what was created. */
export function ImportFindingsButton({ snapshotId }: { snapshotId: string }) {
  const { importFromPicker, isImporting, outcome, dismiss } = useImportFindings(snapshotId);

  return (
    <>
      <Button size="sm" disabled={isImporting} onClick={importFromPicker}>
        {isImporting ? 'Importing...' : 'Import findings…'}
      </Button>
      <Dialog
        open={outcome !== undefined}
        onOpenChange={(isOpen) => {
          if (!isOpen) dismiss();
        }}
      >
        <DialogContent className="w-[min(640px,100%)]">
          <DialogHeader title="Import findings" description={outcome?.fileName} />
          <DialogBody>
            {outcome?.result ? <ImportFindingsSummary result={outcome.result} /> : null}
            {outcome?.message ? (
              <Callout variant="warn">
                <span className="whitespace-pre-wrap">{outcome.message}</span>
              </Callout>
            ) : null}
            <DialogFooter>
              <DialogClose render={<Button variant="primary" />}>Close</DialogClose>
            </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
