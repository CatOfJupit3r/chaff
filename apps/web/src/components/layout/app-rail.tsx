import { Link, useParams } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { useEffect } from 'react';

import type { IconComponent } from '@~/components/icons/create-icon';
import { DiffIcon, FocusIcon, InboxIcon } from '@~/components/icons/icons';
import { Logo } from '@~/components/ui/logo';
import { lastSnapshotIdAtom } from '@~/features/reviews/last-review.store';

const RAIL_LINK_CLASS =
  'relative flex w-[52px] flex-col items-center gap-1 rounded-md pt-[7px] pb-1.5 text-[10.5px] tracking-[0.01em] text-faint hover:bg-hover hover:text-fg aria-[current=page]:bg-raised aria-[current=page]:text-fg';

interface iRailLinkProps {
  to: LinkProps['to'];
  params?: LinkProps['params'];
  icon: IconComponent;
  label: string;
}

function RailLink({ to, params, icon: Icon, label }: iRailLinkProps) {
  return (
    <Link to={to} params={params} activeOptions={{ exact: true, includeSearch: false }} className={RAIL_LINK_CLASS}>
      <Icon />
      {label}
    </Link>
  );
}

/** Screens: the review list, and Focus and Full diff for the review open now or most recently. */
export function AppRail() {
  const { snapshotId } = useParams({ strict: false });
  const [lastSnapshotId, setLastSnapshotId] = useAtom(lastSnapshotIdAtom);
  const reviewSnapshotId = snapshotId ?? lastSnapshotId;

  useEffect(() => {
    if (snapshotId) setLastSnapshotId(snapshotId);
  }, [snapshotId, setLastSnapshotId]);

  return (
    <nav aria-label="Screens" className="flex flex-col items-center gap-1 border-r border-line bg-canvas py-3.5">
      <Logo className="mb-3.5 text-fg" />
      <RailLink to="/" icon={InboxIcon} label="Reviews" />
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
    </nav>
  );
}
