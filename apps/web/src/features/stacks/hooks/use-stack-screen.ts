import { useQuery } from '@tanstack/react-query';
import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import { REVIEW_TARGET_KINDS } from '@chaff/common/enums/review.enums';

import { useReviewTargets } from '@~/features/reviews/hooks/use-review-targets';
import { summarizeStackReview } from '@~/features/reviews/stack-review.utils';
import { useWorkspaces } from '@~/features/workspaces/hooks/use-workspaces';
import { buildLocalStacks } from '@~/features/workspaces/local-stacks.utils';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import { findStack } from '../stack.utils';
import { STACK_VIEWS, stackViewValues } from '../stacks.enums';

const stackScreenParsers = {
  workspace: parseAsString,
  branch: parseAsString,
  view: parseAsStringLiteral(stackViewValues).withDefault(STACK_VIEWS.own),
};

/** The stack shown, the branch selected in it and the view, all kept in the URL. */
export function useStackScreen() {
  const workspaces = useWorkspaces();
  const [state, setState] = useQueryStates(stackScreenParsers, { history: 'replace' });
  const workspace = workspaces.find((candidate) => candidate.id === state.workspace) ?? workspaces[0];
  const branchesQuery = useQuery(
    tanstackRPC.workspaces.branches.queryOptions({
      input: { workspaceId: workspace?.id ?? '' },
      enabled: workspace !== undefined,
    }),
  );
  const targets = useReviewTargets();
  const branches = branchesQuery.data ?? [];
  const stack = workspace ? findStack(buildLocalStacks(workspace, branches), state.branch) : undefined;
  const review = stack ? summarizeStackReview(stack, targets) : undefined;
  const selected =
    review?.links.find((link) => link.branch.name === state.branch) ?? review?.next ?? review?.links.at(-1);
  const targetOf = (kind: typeof REVIEW_TARGET_KINDS.CUMULATIVE | typeof REVIEW_TARGET_KINDS.WORKING_CHANGES) =>
    targets.find(
      (target) =>
        target.workspaceId === workspace?.id && target.branch === selected?.branch.name && target.kind === kind,
    );

  return {
    workspace,
    branches,
    isLoading: branchesQuery.isPending,
    stack,
    links: review?.links ?? [],
    selected,
    cumulativeTarget: targetOf(REVIEW_TARGET_KINDS.CUMULATIVE),
    workingTarget: targetOf(REVIEW_TARGET_KINDS.WORKING_CHANGES),
    view: state.view,
    select: async (branch: string) => setState({ branch }),
    setView: async (view: typeof state.view) => setState({ view }),
  };
}
