import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StackOutline } from '@~/features/overview/components/stack-outline';
import { StackTrain } from '@~/features/overview/components/stack-train';
import type { useStackList } from '@~/features/overview/hooks/use-stack-list';
import { INCLUSIVE_STACK_FILTERS } from '@~/features/overview/overview.constants';
import type { iOverviewBranch, iOverviewStack } from '@~/features/overview/overview.types';
import { listStacks } from '@~/features/overview/stack-list.utils';

import { builtStack, stackMember } from '../stacks/stack-fixtures';
import { workspace } from '../workspaces/workspace-fixtures';

function overviewStack(id: string, title: string, names: readonly string[], titles: readonly string[]) {
  return {
    id,
    title,
    tipBranch: names.at(-1) ?? '',
    workspace,
    base: 'main',
    isHidden: false,
    stack: builtStack(names),
    branches: names.map((name, index) => ({
      name,
      title: titles[index] ?? name,
      parent: index === 0 ? 'main' : names[index - 1],
      member: stackMember(name),
    })),
  } satisfies iOverviewStack;
}

const longNames = Array.from({ length: 20 }, (_, index) => `branch-${index + 1}`);
const longStack = overviewStack(
  'delivery',
  'Delivery reliability',
  longNames,
  longNames.map((_, index) => `Change ${index + 1}`),
);
const otherStack = overviewStack('signatures', 'Webhook signatures', ['signature'], ['Verify signatures']);

function NavigationExample() {
  const [stack, setStack] = useState<iOverviewStack>(longStack);
  const [query, setQuery] = useState('');
  const [selectedName, setSelectedName] = useState('branch-7');
  const branch = stack.branches.find((item) => item.name === selectedName) ?? stack.branches[0];
  const selectBranch = async (next: iOverviewBranch) => {
    setSelectedName(next.name);
    return new URLSearchParams();
  };
  const selectStack = async (next: iOverviewStack) => {
    setStack(next);
    setSelectedName(next.branches[0]?.name ?? '');
    return new URLSearchParams();
  };
  const stackList: ReturnType<typeof useStackList> = {
    query,
    setQuery,
    isShowingHidden: false,
    setIsShowingHidden: vi.fn(),
    filters: INCLUSIVE_STACK_FILTERS,
    setFilters: vi.fn(),
    toggleHidden: vi.fn(),
    ...listStacks({ stacks: [longStack, otherStack], filters: INCLUSIVE_STACK_FILTERS, query, isShowingHidden: false }),
  };
  if (!branch) return null;
  return (
    <>
      <StackOutline
        stackList={stackList}
        stack={stack}
        branch={branch}
        selectStack={selectStack}
        selectBranch={selectBranch}
        onNewStack={vi.fn()}
        importLabel="Import"
      />
      <StackTrain
        stack={stack}
        branch={branch}
        onSelectBranch={selectBranch}
        branches={[]}
        stackedBranches={new Set()}
      />
    </>
  );
}

function dockedCar() {
  return within(screen.getByRole('toolbar', { name: 'Stack branches' })).getByRole('button', { pressed: true });
}

describe('stack train', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    globalThis.ResizeObserver = class {
      public observe() {}
      public unobserve() {}
      public disconnect() {}
    };
  });

  it('jumps to the twentieth branch through search and docks it, then returns to the first', async () => {
    const user = userEvent.setup();
    render(<NavigationExample />);
    const preview = screen.getByRole('region', { name: 'Stack preview' });
    expect(within(preview).getByText('Branch 7 of 20')).toBeInTheDocument();
    expect(dockedCar()).toHaveTextContent('Change 7');

    const search = screen.getByRole('textbox', { name: 'Find stack or branch' });
    fireEvent.change(search, { target: { value: 'Change 20' } });
    await user.click(
      within(screen.getByRole('navigation', { name: 'Stack branches' })).getByRole('button', { name: /Change 20/ }),
    );
    expect(within(preview).getByText('Branch 20 of 20')).toBeInTheDocument();
    expect(dockedCar()).toHaveTextContent('Change 20');
    expect(screen.getByRole('button', { name: 'Next branch' })).toBeDisabled();

    fireEvent.change(search, { target: { value: '' } });
    await user.click(
      within(screen.getByRole('navigation', { name: 'Stack branches' })).getByText('Change 1', { exact: true }),
    );
    expect(within(preview).getByText('Branch 1 of 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous branch' })).toBeDisabled();
  });

  it('moves one branch per flick of the wheel over the train, and by arrow keys', async () => {
    const user = userEvent.setup();
    render(<NavigationExample />);
    const train = screen.getByRole('toolbar', { name: 'Stack branches' });

    fireEvent.wheel(train, { deltaY: 120 });
    fireEvent.wheel(train, { deltaY: 120 });
    expect(dockedCar()).toHaveTextContent('Change 8');

    train.focus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(dockedCar()).toHaveTextContent('Change 6');
  });

  it('switches stacks without leaving the old selection behind', async () => {
    const user = userEvent.setup();
    render(<NavigationExample />);
    await user.click(screen.getByRole('button', { name: /Webhook signatures/ }));
    const preview = screen.getByRole('region', { name: 'Stack preview' });
    expect(within(preview).getByText('Branch 1 of 1')).toBeInTheDocument();
    expect(within(preview).getByText('Verify signatures')).toBeInTheDocument();
    expect(within(preview).queryByText('Change 7')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delivery reliability/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
