import { Menu } from '@base-ui/react/menu';
import { useNavigate } from '@tanstack/react-router';

import { CheckIcon, DownIcon } from '@~/components/icons/icons';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';

import { useReviewTargets } from '../hooks/use-review-targets';
import { REVIEW_TARGET_KIND_PILLS } from '../reviews.enums';
import type { iReviewTarget, iSnapshot } from '../reviews.types';

function targetLabel(target: iReviewTarget) {
  const kind = REVIEW_TARGET_KIND_PILLS.get(target.kind);
  return kind ? `${target.branch} · ${kind}` : target.branch;
}

/** Switches to another started review in the same repository. */
export function ReviewSwitcher({ snapshot }: { snapshot: iSnapshot }) {
  const navigate = useNavigate();
  const targets = useReviewTargets().filter(
    (target) => target.workspaceId === snapshot.workspaceId && target.latestSnapshot && !target.archived,
  );

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Switch review"
        title="Switch review"
        className="inline-flex size-[26px] flex-none items-center justify-center rounded-sm text-faint hover:bg-hover hover:text-fg data-popup-open:bg-raised data-popup-open:text-fg"
      >
        <DownIcon className="size-3.5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-60">
          <Menu.Popup className="max-h-[min(420px,var(--available-height))] w-[min(380px,calc(100vw-32px))] overflow-auto rounded-lg border border-line-strong bg-surface p-1 shadow-panel outline-none">
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.04em] text-faint uppercase">
                Reviews in this repository
              </Menu.GroupLabel>
              {targets.map((target) => {
                const isCurrent = target.id === snapshot.targetId;
                return (
                  <Menu.Item
                    key={target.id}
                    onClick={() => {
                      if (target.latestSnapshot && !isCurrent) {
                        void navigate({
                          to: '/reviews/$snapshotId',
                          params: { snapshotId: target.latestSnapshot.id },
                        });
                      }
                    }}
                    className="grid cursor-default grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 rounded-sm px-2.5 py-1.5 text-[12.5px] text-fg outline-none data-highlighted:bg-hover"
                  >
                    <span className="text-accent">{isCurrent ? <CheckIcon className="size-3.5" /> : null}</span>
                    <span className="min-w-0 truncate">
                      {target.change ? (
                        <>
                          <span className="font-mono text-muted">
                            {changeLabel(target.change.host, target.change.number)}
                          </span>{' '}
                          {target.change.title}
                        </>
                      ) : (
                        <span className="font-mono">{targetLabel(target)}</span>
                      )}
                    </span>
                    <span className="font-mono text-[11.5px] text-muted tabular-nums">
                      {target.latestSnapshot?.accountedRegionCount} / {target.latestSnapshot?.regionCount}
                    </span>
                  </Menu.Item>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
