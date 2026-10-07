import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import { Button } from '@~/components/ui/button';

import type { iDigestRevision } from '../digests.types';

interface iPartVersionPickerProps {
  revisions: readonly iDigestRevision[];
  onSelect: (revisionId: string | undefined) => void;
}

/** v1 is the digest's own version and each later one a rewrite; the one pressed is shown everywhere. */
export function PartVersionPicker({ revisions, onSelect }: iPartVersionPickerProps) {
  const ready = revisions.filter((revision) => revision.status === DIGEST_STATUSES.READY);
  if (ready.length === 0) return null;
  const isOriginalShown = !ready.some((revision) => revision.isSelected);

  return (
    <div role="group" aria-label="Versions" className="inline-flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={isOriginalShown}
        title="The digest's own version"
        onClick={() => onSelect(undefined)}
      >
        v1
      </Button>
      {ready.map((revision, index) => (
        <Button
          key={revision.id}
          variant="ghost"
          size="sm"
          aria-pressed={revision.isSelected}
          title={revision.instructions}
          onClick={() => onSelect(revision.id)}
        >
          v{index + 2}
        </Button>
      ))}
    </div>
  );
}
