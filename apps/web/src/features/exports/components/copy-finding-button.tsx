import { EXPORT_SCOPES } from '@chaff/common/enums/export.enums';
import { findingStatusValues } from '@chaff/common/enums/review.enums';

import { CopyIcon } from '@~/components/icons/icons';
import { showToast } from '@~/components/toast/toast-store';
import { Button } from '@~/components/ui/button';
import type { iFinding } from '@~/features/findings/findings.types';
import { useCopyText } from '@~/hooks/use-copy-text';
import client from '@~/utils/orpc';
import { getErrorMessage } from '@~/utils/rpc-errors';

/** Copies one finding as Markdown, with its place and quoted code, to hand to an agent or a colleague. */
export function CopyFindingButton({ finding }: { finding: iFinding }) {
  const copy = useCopyText();
  const copyFinding = async () => {
    try {
      const packet = await client.exports.packet({
        snapshotId: finding.snapshotId,
        scope: EXPORT_SCOPES.review,
        statuses: [...findingStatusValues],
        findingIds: [finding.id],
        shouldQuoteCode: true,
        shouldListUnreviewed: false,
      });
      await copy(packet.markdown, `F-${finding.number} copied as Markdown`);
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={async () => copyFinding()}>
      <CopyIcon />
      Copy
    </Button>
  );
}
