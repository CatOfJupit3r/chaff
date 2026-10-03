import { List } from '@~/components/ui/list';
import { SectionLabel } from '@~/components/ui/section-label';
import { useReviewTargets } from '@~/features/reviews/hooks/use-review-targets';

import { useLocalStacks } from '../hooks/use-local-stacks';
import type { iWorkspace } from '../workspaces.types';
import { NoLocalStacks } from './empty-components';
import { BranchesErrorRow } from './error-components';
import { StackRowsSkeleton } from './skeleton-components';
import { StackRow } from './stack-row';

export function LocalStacksGroup({ workspaces }: { workspaces: readonly iWorkspace[] }) {
  const { isPending, failures, stacks } = useLocalStacks(workspaces);
  const reviewTargets = useReviewTargets();
  const isEmpty = !isPending && failures.length === 0 && stacks.length === 0;

  return (
    <section aria-label="Local stacks" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>Local stacks</SectionLabel>
        <SectionLabel>Units reviewed</SectionLabel>
      </div>
      <List>
        {failures.map(({ workspace, error }) => (
          <BranchesErrorRow key={workspace.id} workspace={workspace} error={error} />
        ))}
        {isPending ? <StackRowsSkeleton /> : null}
        {stacks.map((stack) => (
          <StackRow key={`${stack.workspace.id}:${stack.tip.name}`} stack={stack} reviewTargets={reviewTargets} />
        ))}
        {isEmpty ? <NoLocalStacks /> : null}
      </List>
    </section>
  );
}
