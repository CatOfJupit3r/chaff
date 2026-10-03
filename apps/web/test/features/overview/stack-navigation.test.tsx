import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StackNeighborhood } from '@~/features/overview/components/stack-neighborhood';
import { StackOutline } from '@~/features/overview/components/stack-outline';
import type { iOverviewBranch, iOverviewStack } from '@~/features/overview/overview.types';

import { workspace } from '../workspaces/workspace-fixtures';

const longStack: iOverviewStack = {
  id: 'delivery',
  title: 'Delivery reliability',
  workspace,
  base: 'main',
  hasCycle: false,
  branches: Array.from({ length: 20 }, (_, index) => ({
    name: `branch-${index + 1}`,
    title: `Change ${index + 1}`,
    parent: index === 0 ? 'main' : `branch-${index}`,
  })),
};
const otherStack: iOverviewStack = {
  id: 'signatures',
  title: 'Webhook signatures',
  workspace,
  base: 'main',
  hasCycle: false,
  branches: [{ name: 'signature', title: 'Verify signatures', parent: 'main' }],
};

function NavigationExample() {
  const [stack, setStack] = useState(longStack);
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
  if (!branch) return null;
  return (
    <>
      <StackOutline
        stacks={[longStack, otherStack]}
        stack={stack}
        branch={branch}
        selectStack={selectStack}
        selectBranch={selectBranch}
      />
      <StackNeighborhood stack={stack} branch={branch} onSelectBranch={selectBranch} />
    </>
  );
}

describe('long stack navigation', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('jumps to the twentieth branch through search, shows only its neighbors, and returns to the first', async () => {
    const user = userEvent.setup();
    render(<NavigationExample />);
    const preview = screen.getByRole('region', { name: 'Stack preview' });
    expect(within(preview).getByText('Branch 7 of 20')).toBeInTheDocument();
    expect(within(preview).getAllByRole('listitem')).toHaveLength(3);
    await user.type(screen.getByRole('textbox', { name: 'Find stack or branch' }), 'Change 20');
    await user.click(
      within(screen.getByRole('navigation', { name: 'Stack branches' })).getByRole('button', { name: /Change 20/ }),
    );
    expect(within(preview).getByText('Branch 20 of 20')).toBeInTheDocument();
    expect(within(preview).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Next branch' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show later branches' })).toBeDisabled();
    await user.clear(screen.getByRole('textbox', { name: 'Find stack or branch' }));
    await user.click(
      within(screen.getByRole('navigation', { name: 'Stack branches' })).getByText('Change 1', { exact: true }),
    );
    expect(within(preview).getByText('Branch 1 of 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous branch' })).toBeDisabled();
  });

  it('switches stacks without leaving the old selection or dependency preview behind', async () => {
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
