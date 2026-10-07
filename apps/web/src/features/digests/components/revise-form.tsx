import { useState } from 'react';

import type { DigestPart } from '@chaff/common/enums/digest.enums';

import { Button } from '@~/components/ui/button';
import { Kbd } from '@~/components/ui/kbd';
import { TextArea } from '@~/components/ui/text-area';

import { DIGEST_PART_REVISE_PLACEHOLDERS } from '../digests.enums';

interface iReviseFormProps {
  part: DigestPart;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (instructions: string) => unknown;
}

/** What to change about a part of the digest; Enter has the agent rewrite it, Escape cancels. */
export function ReviseForm({ part, isSaving, onCancel, onSubmit }: iReviseFormProps) {
  const [instructions, setInstructions] = useState('');
  const submit = () => {
    if (instructions.trim() && !isSaving) onSubmit(instructions.trim());
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-accent-line bg-surface p-2.5">
      <TextArea
        autoFocus
        value={instructions}
        aria-label="How to improve it"
        placeholder={DIGEST_PART_REVISE_PLACEHOLDERS.get(part)}
        className="h-[64px]"
        onChange={(event) => setInstructions(event.target.value)}
        onSubmit={submit}
        onEscape={onCancel}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-[11.5px] text-faint">The current version is kept; you can switch back.</span>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel <Kbd>Esc</Kbd>
        </Button>
        <Button variant="primary" size="sm" disabled={isSaving || !instructions.trim()} onClick={submit}>
          Rewrite <Kbd className="border-current/30 bg-transparent text-inherit">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
