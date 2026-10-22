import { useState } from 'react';

import { DEFAULT_STACK_FILTERS } from '@chaff/common/constants/stack-filters.constants';

import { useStackActions } from '@~/features/stacks/hooks/use-stack-actions';
import { useUpdateStackView } from '@~/features/workspaces/hooks/use-update-stack-view';
import type { iWorkspace } from '@~/features/workspaces/workspaces.types';

import type { iOverviewStack, iStackFilters } from '../overview.types';
import { listStacks } from '../stack-list.utils';

interface iStackListOptions {
  workspace: iWorkspace | undefined;
  stacks: readonly iOverviewStack[];
}

/** Search, saved filters, hidden and deleted stacks of one repository's stack list. */
export function useStackList({ workspace, stacks }: iStackListOptions) {
  const [query, setQuery] = useState('');
  const [isShowingHidden, setIsShowingHidden] = useState(false);
  const { mutate: updateStackView } = useUpdateStackView();
  const { setHidden, remove } = useStackActions();
  const filters = workspace?.stackFilters ?? DEFAULT_STACK_FILTERS;

  const setFilters = (changes: Partial<iStackFilters>) => {
    if (workspace) updateStackView({ workspaceId: workspace.id, stackFilters: { ...filters, ...changes } });
  };
  const toggleHidden = (stack: iOverviewStack) => setHidden.mutate({ stackId: stack.id, isHidden: !stack.isHidden });
  const deleteStack = (stack: Pick<iOverviewStack, 'id'>, onDeleted: () => unknown) =>
    remove.mutate({ stackId: stack.id }, { onSuccess: onDeleted });

  return {
    query,
    setQuery,
    isShowingHidden,
    setIsShowingHidden,
    filters,
    setFilters,
    toggleHidden,
    deleteStack,
    isDeleting: remove.isPending,
    ...listStacks({ stacks, filters, query, isShowingHidden }),
  };
}
