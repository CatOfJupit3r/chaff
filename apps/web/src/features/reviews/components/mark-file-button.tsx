import { useState } from 'react';

import { CheckIcon, SkipIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { TextInput } from '@~/components/ui/text-input';

import { useDiffReview } from '../diff-review.context';

/**
 * Decides the file's undecided units at once: Looks good, or Skip with a reason such as "lockfile".
 * Hidden once every unit has a decision.
 */
export function MarkFileButton({ fileId }: { fileId: string }) {
  const { unitsByFile, markFile } = useDiffReview();
  const [reason, setReason] = useState<string>();
  const units = unitsByFile.get(fileId) ?? [];
  if (!units.some((unit) => unit.mark === undefined)) return null;

  const skip = () => {
    const text = reason?.trim();
    if (!text) return;
    markFile(fileId, text);
    setReason(undefined);
  };

  if (reason !== undefined) {
    return (
      <span className="flex items-center gap-1.5">
        <TextInput
          aria-label="Why skip this file"
          placeholder="Why skip? e.g. lockfile"
          value={reason}
          autoFocus
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') skip();
            if (event.key === 'Escape') setReason(undefined);
          }}
          className="h-[26px] w-48 text-[12px]"
        />
        <Button size="sm" disabled={!reason.trim()} onClick={skip}>
          Skip
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setReason(undefined)}>
          Cancel
        </Button>
      </span>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title="Skip every unit in this file without a decision, with a reason"
        onClick={() => setReason('')}
      >
        <SkipIcon />
        Skip…
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Mark every unit in this file without a decision as Looks good"
        onClick={() => markFile(fileId)}
      >
        <CheckIcon />
        Looks good
      </Button>
    </>
  );
}
