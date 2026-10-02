import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { Screen } from '@~/components/layout/screen';
import { TopBar } from '@~/components/layout/top-bar';
import { useAllFindings } from '@~/features/findings/hooks/use-findings';
import { pluralize } from '@~/utils/pluralize';

import { useStackScreen } from '../hooks/use-stack-screen';
import { lastStackAtom } from '../last-stack.store';
import { BranchPanel } from './branch-panel';
import { StackChainList } from './stack-chain-list';

/** A stack of branches: each one's progress on the left, the selected branch and its review on the right. */
export function StackScreen() {
  const screen = useStackScreen();
  const findings = useAllFindings().data ?? [];
  const setLastStack = useSetAtom(lastStackAtom);
  const { workspace, stack, links, selected } = screen;
  const selectedIndex = links.findIndex((link) => link.branch.name === selected?.branch.name);
  const dependents = links.slice(selectedIndex + 1).map((link) => link.branch.name);

  useEffect(() => {
    if (workspace && selected) setLastStack({ workspace: workspace.id, branch: selected.branch.name });
  }, [workspace, selected, setLastStack]);

  return (
    <>
      <TopBar>
        <span>{workspace?.name ?? 'Stack'}</span>
        <span className="text-faint">/</span>
        <b className="font-medium text-fg">Stack</b>
      </TopBar>
      <Screen>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
          <div>
            <h1 className="m-0 font-mono text-[20px] font-semibold tracking-[-0.015em] break-all">
              {stack?.tip.name ?? 'No stack'}
            </h1>
            <p className="m-0 mt-1 text-muted">
              {stack
                ? `${pluralize(links.length, 'branch', 'branches')} on ${stack.base ?? 'no base'} · ${pluralize(stack.commitCount, 'commit')}`
                : 'Pick a stack from Reviews to see its branches here.'}
            </p>
          </div>
          {stack && workspace && selected ? (
            <div className="grid grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-start gap-5">
              <StackChainList
                workspaceId={stack.workspace.id}
                links={links}
                base={stack.base}
                findings={findings}
                selectedBranch={selected.branch.name}
                onSelect={screen.select}
              />
              <BranchPanel
                key={selected.branch.name}
                workspaceId={workspace.id}
                link={selected}
                branches={screen.branches}
                base={stack.base}
                dependents={dependents}
                view={screen.view}
                cumulativeTarget={screen.cumulativeTarget}
                workingTarget={screen.workingTarget}
                onViewChange={screen.setView}
              />
            </div>
          ) : null}
        </div>
      </Screen>
    </>
  );
}
