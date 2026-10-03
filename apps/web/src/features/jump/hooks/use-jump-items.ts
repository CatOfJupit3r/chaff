import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';

import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { unitsQueryOptions } from '@~/features/focus/hooks/use-units';
import { useReviewTargets } from '@~/features/reviews/hooks/use-review-targets';
import { snapshotQueryOptions } from '@~/features/reviews/hooks/use-snapshot';
import { DIFF_MODES } from '@~/features/reviews/reviews.enums';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

import { JUMP_GROUPS } from '../jump.enums';
import type { iJumpItem } from '../jump.utils';

const SCREENS = [
  { to: '/', label: 'Reviews' },
  { to: '/stack', label: 'Stack' },
  { to: '/findings', label: 'Findings' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
] as const;

/** Everything Jump to can open: the open review's units and files, other reviews, and the screens. */
export function useJumpItems(): iJumpItem[] {
  const navigate = useNavigate();
  const { snapshotId = '' } = useParams({ strict: false });
  const hasReview = snapshotId !== '';
  const { data: units = [] } = useQuery({ ...unitsQueryOptions(snapshotId), enabled: hasReview });
  const { data: snapshot } = useQuery({ ...snapshotQueryOptions(snapshotId), enabled: hasReview });
  const { data: workspaces = [] } = useQuery(workspacesQueryOptions);
  const targets = useReviewTargets();
  const files = snapshot?.files ?? [];
  const pathOf = new Map(files.map((file) => [file.id, file.path]));
  const nameOf = new Map(workspaces.map((workspace) => [workspace.id, workspace.name]));

  const cards = units.map((unit) => ({
    id: `unit:${unit.id}`,
    group: JUMP_GROUPS.CARD,
    label: unit.title,
    detail: pathOf.get(unit.fileId),
    open: async () => navigate({ to: '/reviews/$snapshotId', params: { snapshotId }, search: { unit: unit.id } }),
  }));
  const fileItems = files.map((file) => ({
    id: `file:${file.id}`,
    group: JUMP_GROUPS.FILE,
    label: file.path,
    detail: `+${file.additions} -${file.deletions}`,
    open: async () =>
      navigate({
        to: '/reviews/$snapshotId/diff',
        params: { snapshotId },
        search: { file: file.path, mode: DIFF_MODES.file },
      }),
  }));
  const reviews = targets.flatMap((target) => {
    const latest = target.latestSnapshot;
    if (!latest || target.archived || latest.id === snapshotId) return [];
    const { change } = target;
    return [
      {
        id: `review:${target.id}`,
        group: JUMP_GROUPS.REVIEW,
        label: change ? `${changeLabel(change.host, change.number)} ${change.title}` : target.branch,
        detail: `${nameOf.get(target.workspaceId) ?? ''} · onto ${target.parentBranch}`,
        open: async () => navigate({ to: '/reviews/$snapshotId', params: { snapshotId: latest.id } }),
      },
    ];
  });
  const screens = SCREENS.map((screen) => ({
    id: `screen:${screen.to}`,
    group: JUMP_GROUPS.SCREEN,
    label: screen.label,
    open: async () => navigate({ to: screen.to }),
  }));

  return [...cards, ...fileItems, ...reviews, ...screens];
}
