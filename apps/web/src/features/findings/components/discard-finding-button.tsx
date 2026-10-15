import { showToast } from '@~/components/toast/toast-store';
import { Button } from '@~/components/ui/button';
import { getErrorMessage } from '@~/utils/rpc-errors';

import type { iFinding } from '../findings.types';
import { findingAgentName } from '../findings.utils';
import { useFindingMutations } from '../hooks/use-finding-mutations';

/** Deletes a finding a coding agent wrote, for one the reviewer does not keep. Shown only on agents' findings. */
export function DiscardFindingButton({
  finding,
}: {
  finding: Pick<iFinding, 'id' | 'number' | 'author' | 'authorName'>;
}) {
  const { remove } = useFindingMutations();
  const agent = findingAgentName(finding);
  if (!agent) return null;

  return (
    <Button
      variant="ghost"
      title={`Deletes F-${finding.number} and its history`}
      disabled={remove.isPending}
      onClick={() =>
        remove.mutate(
          { findingId: finding.id },
          {
            onSuccess: () => showToast(`Discarded F-${finding.number} from ${agent}`),
            onError: (error) => showToast(getErrorMessage(error)),
          },
        )
      }
    >
      Discard
    </Button>
  );
}
