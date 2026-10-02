import { useState } from 'react';

import type { iChangeUnit } from '../change-units.types';
import { useChangeUnitActions } from './use-change-unit-actions';

function toggled(set: ReadonlySet<string>, id: string) {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/** What is picked in the Change unit editor, and the edits that act on it. */
export function useChangeEditor(snapshotId: string, changes: readonly iChangeUnit[]) {
  const actions = useChangeUnitActions(snapshotId);
  const [unitIds, setUnitIds] = useState<ReadonlySet<string>>(new Set());
  const [changeIds, setChangeIds] = useState<ReadonlySet<string>>(new Set());
  const [title, setTitle] = useState('');
  const pickedUnits = [...unitIds];
  const clear = () => {
    setUnitIds(new Set());
    setChangeIds(new Set());
  };
  const after = { onSuccess: clear };

  /** A new change from the picked units sits right after the change the first of them came from. */
  const create = () => {
    const source = changes.find((change) => pickedUnits.some((unitId) => change.unitIds.includes(unitId)));
    actions.create.mutate(
      { snapshotId, title: title.trim(), unitIds: pickedUnits, afterChangeUnitId: source?.id },
      {
        onSuccess: () => {
          clear();
          setTitle('');
        },
      },
    );
  };

  const move = (index: number, delta: number) => {
    const order = changes.map((change) => change.id);
    const [moved] = order.splice(index, 1);
    if (moved === undefined) return;
    order.splice(Math.max(0, Math.min(order.length, index + delta)), 0, moved);
    actions.reorder.mutate({ snapshotId, changeUnitIds: order });
  };

  return {
    unitIds,
    changeIds,
    title,
    setTitle,
    isBusy: Object.values(actions).some((action) => action.isPending),
    toggleUnit: (unitId: string) => setUnitIds((current) => toggled(current, unitId)),
    toggleChange: (changeId: string) => setChangeIds((current) => toggled(current, changeId)),
    create,
    moveHere: (changeUnitId: string) =>
      actions.moveUnits.mutate({ snapshotId, unitIds: pickedUnits, changeUnitId }, after),
    takeOut: () => actions.moveUnits.mutate({ snapshotId, unitIds: pickedUnits, changeUnitId: null }, after),
    merge: () =>
      actions.merge.mutate(
        { snapshotId, changeUnitIds: changes.filter((change) => changeIds.has(change.id)).map((change) => change.id) },
        after,
      ),
    rename: (changeUnitId: string, newTitle: string) =>
      actions.rename.mutate({ snapshotId, changeUnitId, title: newTitle }),
    move,
    ungroup: (changeUnitId: string) => actions.remove.mutate({ snapshotId, changeUnitId }, after),
    adoptDigest: () => actions.adoptDigest.mutate({ snapshotId }, after),
  };
}
