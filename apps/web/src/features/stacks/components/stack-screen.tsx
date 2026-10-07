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
import { StackHostChanges } from './stack-host-changes';

/** A stack of branches: each one's progress on the left, the selected branch and its review on the right. */
export function StackScreen() {
  const screen = useStackScreen();
  const findings = useAllFindings().data ?? [];
  const setLastStack = useSetAtom(lastStackAtom);
  const { workspace, stack, links, selected } = screen;
  const selectedIndex = links.findIndex((link) => link.name === selected?.name);
  const dependents = links.slice(selectedIndex + 1).map((link) => link.name);
  const commitCount = stack?.branches.reduce((total, member) => total + member.commitsAhead, 0) ?? 0;
  const stackedBranches = new Set(
    screen.stacks.flatMap((candidate) => candidate.branches.map((member) => member.branch)),
  );

  useEffect(() => {
    if (workspace && stack && selected) {
      setLastStack({ workspace: workspace.id, stack: stack.id, branch: selected.name });
    }
  }, [workspace, stack, selected, setLastStack]);

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
              {stack?.branches.at(-1)?.branch ?? 'No stack'}
            </h1>
            <p className="m-0 mt-1 text-muted">
              {stack
                ? `${pluralize(links.length, 'branch', 'branches')} ${stack.baseBranch ? `on ${stack.baseBranch}` : '· base not chosen yet'} · ${pluralize(commitCount, 'commit')}`
                : 'Start a stack from Reviews to see its branches here.'}
            </p>
          </div>
          {stack ? <StackHostChanges stack={stack} /> : null}
          {stack && workspace && selected ? (
            <div className="grid grid-cols-[minmax(280px,420px)_minmax(0,1fr)] items-start gap-5">
              <StackChainList
                stack={stack}
                workspace={workspace}
                branches={screen.branches}
                stackedBranches={stackedBranches}
                links={links}
                findings={findings}
                selectedBranch={selected.name}
                onSelect={screen.select}
              />
              <BranchPanel
                key={selected.name}
                workspaceId={workspace.id}
                stackId={stack.id}
                link={selected}
                base={stack.baseBranch}
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
