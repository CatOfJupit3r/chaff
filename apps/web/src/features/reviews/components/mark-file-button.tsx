import { CheckIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

import { useDiffReview } from '../diff-review.context';

/** Marks the file's undecided units as Looks good; hidden once every unit has a decision. */
export function MarkFileButton({ fileId }: { fileId: string }) {
  const { unitsByFile, markFile } = useDiffReview();
  const units = unitsByFile.get(fileId) ?? [];
  if (!units.some((unit) => unit.mark === undefined)) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      title="Mark every unit in this file without a decision as Looks good"
      onClick={() => markFile(fileId)}
    >
      <CheckIcon />
      Looks good
    </Button>
  );
}
