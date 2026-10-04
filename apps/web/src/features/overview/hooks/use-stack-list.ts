import { useState } from 'react';

import { DEFAULT_STACK_FILTERS, MAX_HIDDEN_STACKS } from '@chaff/common/constants/stack-filters.constants';

import { useUpdateStackView } from '@~/features/workspaces/hooks/use-update-stack-view';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';

import type { iOverviewStack, iStackFilters } from '../overview.types';
import { listStacks } from '../stack-list.utils';

interface iStackListOptions {
  workspace: iWorkspace | undefined;
  stacks: readonly iOverviewStack[];
}

/** Search, saved filters and hidden stacks of one repository's stack list. */
export function useStackList({ workspace, stacks }: iStackListOptions) {
  const [query, setQuery] = useState('');
  const [isShowingHidden, setIsShowingHidden] = useState(false);
  const { mutate: updateStackView } = useUpdateStackView();
  const filters = workspace?.stackFilters ?? DEFAULT_STACK_FILTERS;
  const hiddenStacks = workspace?.hiddenStacks ?? [];

  const setFilters = (changes: Partial<iStackFilters>) => {
    if (workspace) updateStackView({ workspaceId: workspace.id, stackFilters: { ...filters, ...changes } });
  };
  const toggleHidden = (stack: iOverviewStack) => {
    if (!workspace) return;
    const isHidden = hiddenStacks.includes(stack.tipBranch);
    const next = isHidden
      ? hiddenStacks.filter((name) => name !== stack.tipBranch)
      : [...hiddenStacks, stack.tipBranch].slice(-MAX_HIDDEN_STACKS);
    updateStackView({ workspaceId: workspace.id, hiddenStacks: next });
  };

  return {
    query,
    setQuery,
    isShowingHidden,
    setIsShowingHidden,
    filters,
    setFilters,
    toggleHidden,
    ...listStacks({ stacks, filters, hiddenStacks, query, isShowingHidden }),
  };
}
