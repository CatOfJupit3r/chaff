import { DIGEST_INLINE_PATCH_THRESHOLD_CHARS } from '@chaff/common/constants/agents.constants';
import { DIGEST_DIFF_MODE_LABELS, digestDiffModeValues } from '@chaff/common/enums/digest.enums';

import { Field } from '@~/components/ui/field';
import { SegmentedControl } from '@~/components/ui/segmented-control';

import { useSettings } from '../hooks/use-settings';
import { useUpdateSettings } from '../hooks/use-update-settings';

const DIFF_MODE_OPTIONS = digestDiffModeValues.map((value) => ({ value, label: DIGEST_DIFF_MODE_LABELS(value) }));

/** Whether digests carry the branch's diff in the prompt or have the agent read it file by file. */
export function DigestDiffModeField() {
  const { digestDiffMode } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  return (
    <Field
      label="Diff in the digest prompt"
      hint={`Auto puts a diff of up to ${DIGEST_INLINE_PATCH_THRESHOLD_CHARS.toLocaleString('en')} characters in the prompt, which is faster, and has the agent read larger ones file by file. Either way the agent gets each file's patch and parent version in its throwaway copy.`}
    >
      <SegmentedControl
        label="Diff in the digest prompt"
        options={DIFF_MODE_OPTIONS}
        value={digestDiffMode}
        onChange={(mode) => updateSettings({ digestDiffMode: mode })}
      />
    </Field>
  );
}
