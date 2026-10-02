import { Button } from '@~/components/ui/button';
import { List, ListRow } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';

import { useSaveOnboarding } from '../hooks/use-save-onboarding';

export function ReplayOnboarding() {
  const { replay } = useSaveOnboarding();
  return (
    <section aria-label="Onboarding" className="flex flex-col gap-2.5" data-onboarding-replay>
      <SectionLabel>Onboarding</SectionLabel>
      <List>
        <ListRow>
          <div>
            <div className="font-medium">Onboarding guide</div>
            <p className="mt-1 text-[12px] text-muted">Walk through a review using a change of your own.</p>
          </div>
          <Button size="sm" disabled={replay.isPending} onClick={() => replay.mutate(undefined)}>
            Replay onboarding guide
          </Button>
        </ListRow>
      </List>
    </section>
  );
}
