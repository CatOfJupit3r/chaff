import { Link, useParams } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect } from 'react';

import type { IconComponent } from '@~/components/icons/create-icon';
import { DiffIcon, FlagIcon, FocusIcon, InboxIcon, StackIcon } from '@~/components/icons/icons';
import { Logo } from '@~/components/ui/logo';
import { countActive } from '@~/features/findings/findings.utils';
import { useAllFindings } from '@~/features/findings/hooks/use-findings';
import { lastSnapshotIdAtom } from '@~/features/reviews/last-review.store';
import { lastStackAtom } from '@~/features/stacks/last-stack.store';

const RAIL_LINK_CLASS =
  'relative flex w-[52px] flex-col items-center gap-1 rounded-md pt-[7px] pb-1.5 text-[10.5px] tracking-[0.01em] text-faint hover:bg-hover hover:text-fg aria-[current=page]:bg-raised aria-[current=page]:text-fg';

interface iRailLinkProps {
  to: LinkProps['to'];
  params?: LinkProps['params'];
  search?: LinkProps['search'];
  icon: IconComponent;
  label: string;
  /** Count shown on the icon, such as open findings. */
  badge?: number;
}

function RailLink({ to, params, search, icon: Icon, label, badge }: iRailLinkProps) {
  return (
    <Link
      to={to}
      params={params}
      search={search}
      activeOptions={{ exact: true, includeSearch: false }}
      className={RAIL_LINK_CLASS}
    >
      <Icon />
      {badge ? (
        <span className="absolute top-0.5 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-semibold text-canvas tabular-nums">
          {badge}
        </span>
      ) : null}
      {label}
    </Link>
  );
}

/** Screens: the review list, the stack overview, Focus and Full diff for the review open now or most recently, and findings. */
export function AppRail() {
  const { snapshotId } = useParams({ strict: false });
  const [lastSnapshotId, setLastSnapshotId] = useAtom(lastSnapshotIdAtom);
  const reviewSnapshotId = snapshotId ?? lastSnapshotId;
  const lastStack = useAtomValue(lastStackAtom);
  const openFindingCount = countActive(useAllFindings().data ?? []);

  useEffect(() => {
    if (snapshotId) setLastSnapshotId(snapshotId);
  }, [snapshotId, setLastSnapshotId]);

  return (
    <nav aria-label="Screens" className="flex flex-col items-center gap-1 border-r border-line bg-canvas py-3.5">
      <Logo className="mb-3.5 text-fg" />
      <RailLink to="/" icon={InboxIcon} label="Reviews" />
      <RailLink to="/stack" search={lastStack ?? {}} icon={StackIcon} label="Stack" />
      {reviewSnapshotId ? (
        <>
          <RailLink
            to="/reviews/$snapshotId"
            params={{ snapshotId: reviewSnapshotId }}
            icon={FocusIcon}
            label="Focus"
          />
          <RailLink
            to="/reviews/$snapshotId/diff"
            params={{ snapshotId: reviewSnapshotId }}
            icon={DiffIcon}
            label="Diff"
          />
        </>
      ) : null}
      <RailLink to="/findings" icon={FlagIcon} label="Findings" badge={openFindingCount} />
    </nav>
  );
}
