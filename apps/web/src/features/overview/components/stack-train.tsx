import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { STACK_ENDS } from '@chaff/common/enums/stack.enums';
import type { StackEnd } from '@chaff/common/enums/stack.enums';

import { BranchIcon, LeftIcon, PlusIcon, RightIcon } from '@~/components/icons/icons';
import { MarkdownTitle } from '@~/components/markdown/markdown-title';
import { Button } from '@~/components/ui/button';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { StackSlot } from '@~/features/stacks/components/stack-slot';
import { GHOST_SLOT_CLASS } from '@~/features/stacks/stacks.constants';
import { STACK_SLOT_LABELS } from '@~/features/stacks/stacks.enums';
import type { iBranch } from '@~/features/workspaces/workspaces.types';
import { cn } from '@~/lib/utils';

import { useTrainWheel } from '../hooks/use-train-wheel';
import type { iOverviewBranch, iStackNavigation } from '../overview.types';
import { BranchStatus } from './branch-status';

interface iStackTrainProps extends iStackNavigation {
  branches: readonly iBranch[];
  /** Branches of every stack of the repository. */
  stackedBranches: ReadonlySet<string>;
}

interface iTrainCarProps extends Pick<iStackNavigation, 'onSelectBranch'> {
  car: iOverviewBranch;
  ordinal: number;
  isDocked: boolean;
  carRef: (element: HTMLButtonElement | null) => void;
}

function TrainCar({ car, ordinal, isDocked, carRef, onSelectBranch }: iTrainCarProps) {
  return (
    <button
      ref={carRef}
      type="button"
      aria-pressed={isDocked}
      onClick={() => onSelectBranch(car)}
      className={cn(
        'flex min-h-36 w-[264px] shrink-0 flex-col items-start gap-2 rounded-lg border p-4 text-left',
        'transition-[transform,opacity,background-color,border-color] duration-500 ease-out motion-reduce:transition-none',
        isDocked
          ? 'scale-100 border-accent bg-accent-soft'
          : 'scale-[0.94] border-line bg-surface opacity-75 hover:bg-hover hover:opacity-100',
      )}
    >
      <span className="flex items-start gap-2 font-semibold">
        <span className="shrink-0 font-mono text-muted tabular-nums">{String(ordinal).padStart(2, '0')}</span>
        <MarkdownTitle text={car.title} className="line-clamp-2 text-sm wrap-anywhere" />
      </span>
      <BranchStatus branch={car} />
      <span className="w-full truncate font-mono text-xs text-muted" title={car.name}>
        {car.name}
      </span>
      <span className="text-xs text-muted">
        {car.member.isMissing ? 'Not in the repository' : null}
        {!car.member.isMissing && car.change ? changeLabel(car.change.host, car.change.number) : null}
        {!car.member.isMissing && !car.change ? 'Local branch' : null}
      </span>
    </button>
  );
}

/** The faint car at an end of the train, where the next branch would couple on. */
function GhostCar({ end }: { end: StackEnd }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[13px] font-medium">
        <PlusIcon className="size-3.5" />
        {STACK_SLOT_LABELS.get(end)}
      </span>
      <span className="text-[12px]">
        {end === STACK_ENDS.BOTTOM ? 'The branch this stack merges into' : 'A branch that merges into this one'}
      </span>
    </span>
  );
}

function Coupler() {
  return <span aria-hidden="true" className="h-px w-5 shrink-0 self-center bg-line-strong" />;
}

/**
 * The stack as a train, bottom branch first: the selected branch docks at the middle, and the cars glide past it
 * when another one is picked, by click, arrow keys or the wheel over the train. Faint cars at both ends add the
 * next branch; a base pill on the left shows what the stack merges into.
 */
export function StackTrain({ stack, branch, onSelectBranch, branches, stackedBranches }: iStackTrainProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const cars = useRef(new Map<string, HTMLButtonElement>());
  const [offset, setOffset] = useState(0);
  const selectedIndex = stack.branches.findIndex((candidate) => candidate.name === branch.name);
  const previous = stack.branches[selectedIndex - 1];
  const next = stack.branches[selectedIndex + 1];
  const step = (direction: 1 | -1) => {
    const target = stack.branches[selectedIndex + direction];
    if (target) onSelectBranch(target);
  };
  useTrainWheel(viewport, step);

  useLayoutEffect(() => {
    const dock = () => {
      const view = viewport.current;
      const car = cars.current.get(branch.name);
      if (view && car) setOffset(view.clientWidth / 2 - (car.offsetLeft + car.offsetWidth / 2));
    };
    dock();
    const observer = new ResizeObserver(dock);
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [branch.name, stack.branches.length, stack.base]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    }
  };
  const slot = { stack: stack.stack, branches, stackedBranches, side: 'bottom' as const };

  return (
    <section aria-label="Stack preview" className="border-b border-line py-6" data-onboarding-stack>
      <div className="mb-5 flex flex-wrap items-center justify-center gap-3 px-5 lg:px-8">
        <Button variant="icon" size="icon" aria-label="Previous branch" disabled={!previous} onClick={() => step(-1)}>
          <LeftIcon />
        </Button>
        <span className="text-sm font-medium tabular-nums">
          Branch {selectedIndex + 1} of {stack.branches.length}
        </span>
        <Button variant="icon" size="icon" aria-label="Next branch" disabled={!next} onClick={() => step(1)}>
          <RightIcon />
        </Button>
      </div>
      <div
        ref={viewport}
        role="toolbar"
        aria-orientation="horizontal"
        aria-label="Stack branches"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative overflow-hidden py-2 outline-none"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-0.5 w-[264px] -translate-x-1/2 rounded-full bg-accent-line"
        />
        <div
          className="flex w-max items-stretch transition-transform duration-700 ease-[cubic-bezier(0.22,1.16,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${offset}px)` }}
        >
          {stack.base ? (
            <StackSlot
              {...slot}
              end={STACK_ENDS.BOTTOM}
              label={`${stack.base}: insert a branch above it or change it`}
              className="flex h-9 shrink-0 items-center gap-2 self-center rounded-full border border-line px-3 font-mono text-xs text-muted hover:bg-hover data-open:border-accent-line"
            >
              <BranchIcon className="size-3.5" />
              {stack.base}
            </StackSlot>
          ) : (
            <StackSlot
              {...slot}
              end={STACK_ENDS.BOTTOM}
              label={STACK_SLOT_LABELS.get(STACK_ENDS.BOTTOM)}
              className={cn(GHOST_SLOT_CLASS, 'w-[200px] shrink-0 p-4')}
            >
              <GhostCar end={STACK_ENDS.BOTTOM} />
            </StackSlot>
          )}
          {stack.branches.map((car, index) => (
            <span key={car.name} className="flex shrink-0 items-stretch">
              <Coupler />
              <TrainCar
                car={car}
                ordinal={index + 1}
                isDocked={car.name === branch.name}
                onSelectBranch={onSelectBranch}
                carRef={(element) => {
                  if (element) cars.current.set(car.name, element);
                  else cars.current.delete(car.name);
                }}
              />
            </span>
          ))}
          <Coupler />
          <StackSlot
            {...slot}
            end={STACK_ENDS.TOP}
            label={STACK_SLOT_LABELS.get(STACK_ENDS.TOP)}
            className={cn(GHOST_SLOT_CLASS, 'w-[200px] shrink-0 p-4')}
          >
            <GhostCar end={STACK_ENDS.TOP} />
          </StackSlot>
        </div>
      </div>
      {stack.branches.length > 1 ? (
        <p className="m-0 mt-4 text-center text-xs text-muted">
          Each branch merges into the one on its left. Scroll over the stack to move along it.
        </p>
      ) : null}
    </section>
  );
}
