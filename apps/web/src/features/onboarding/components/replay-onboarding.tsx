import { Button } from '@~/components/ui/button';
import { List, ListRow } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';

import { useOnboardingProgress } from '../hooks/use-onboarding-progress';

export function ReplayOnboarding() {
  const { replay } = useOnboardingProgress();
  return (
    <section aria-label="Onboarding" className="flex flex-col gap-2.5">
      <SectionLabel>Onboarding</SectionLabel>
      <List>
        <ListRow>
          <div>
            <div className="font-medium">Getting started</div>
            <p className="mt-1 text-[12px] text-muted">
              A checklist of things to try on a change of your own, in any order.
            </p>
          </div>
          <Button size="sm" disabled={replay.isPending} onClick={() => replay.mutate(undefined)}>
            Replay onboarding guide
          </Button>
        </ListRow>
      </List>
    </section>
  );
}
