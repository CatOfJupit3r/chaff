import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';

import { useFixActions } from '../hooks/use-fix-actions';
import { useFixes } from '../hooks/use-fixes';
import { FixRow } from './fix-row';

/** Fix hand-offs of this review, newest first; nothing shows until there is one. */
export function FixesSection({ snapshotId }: { snapshotId: string }) {
  const fixes = useFixes(snapshotId);
  const actions = useFixActions(snapshotId);
  if (fixes.length === 0) return null;

  return (
    <section aria-label="Agent fixes" className="flex flex-col gap-2.5">
      <SectionLabel>Agent fixes</SectionLabel>
      <List>
        {fixes.map((fix) => (
          <FixRow key={fix.id} fix={fix} onCancel={actions.cancel} onDiscard={actions.discard} />
        ))}
      </List>
    </section>
  );
}
