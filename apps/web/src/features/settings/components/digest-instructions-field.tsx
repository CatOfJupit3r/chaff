import { useState } from 'react';

import { MAX_DIGEST_INSTRUCTIONS_LENGTH } from '@chaff/common/constants/agents.constants';

import { Field } from '@~/components/ui/field';
import { TextArea } from '@~/components/ui/text-input';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';

/** Extra instructions every digest starts with; they can still be changed when starting one. */
export function DigestInstructionsField() {
  const { digestInstructions } = useSettings();
  const updateSettings = useUpdateSettings();
  const [draft, setDraft] = useState(digestInstructions);

  return (
    <Field
      label="Extra instructions for digests"
      hint="Added to every digest prompt in their own section; the digest keeps its usual shape. You can change them when starting a digest."
    >
      <TextArea
        aria-label="Extra instructions for digests"
        value={draft}
        maxLength={MAX_DIGEST_INSTRUCTIONS_LENGTH}
        rows={3}
        placeholder="For example: focus on error handling and say where retries can loop."
        className="max-w-[640px]"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const instructions = draft.trim();
          if (instructions !== digestInstructions) updateSettings.mutate({ digestInstructions: instructions });
        }}
      />
    </Field>
  );
}
