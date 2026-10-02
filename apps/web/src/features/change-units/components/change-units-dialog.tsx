import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { SectionLabel } from '@~/components/ui/section-label';
import { TextInput } from '@~/components/ui/text-input';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';

import type { iChangeUnit } from '../change-units.types';
import { useChangeEditor } from '../hooks/use-change-editor';
import { ChangeEditorRow } from './change-editor-row';
import { UnitPickRow } from './unit-pick-row';

interface iChangeUnitsDialogProps {
  snapshotId: string;
  units: readonly iUnit[];
  files: readonly iSnapshotFile[];
  changes: readonly iChangeUnit[];
  hasDigest: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Group units into the changes they make: make, split, merge, rename, reorder and ungroup Change units. */
export function ChangeUnitsDialog({
  snapshotId,
  units,
  files,
  changes,
  hasDigest,
  isOpen,
  onOpenChange,
}: iChangeUnitsDialogProps) {
  const editor = useChangeEditor(snapshotId, changes);
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const fileOf = (unit: iUnit) => files.find((file) => file.id === unit.fileId);
  const grouped = new Set(changes.flatMap((change) => change.unitIds));
  const loose = units.filter((unit) => !grouped.has(unit.id));
  const pickRow = (unit: iUnit) => (
    <UnitPickRow
      key={unit.id}
      unit={unit}
      file={fileOf(unit)}
      isPicked={editor.unitIds.has(unit.id)}
      onToggle={() => editor.toggleUnit(unit.id)}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(820px,100%)] flex-col overflow-hidden">
        <DialogHeader
          title="Edit changes"
          description="Group units into the changes they make. A unit is in one change at most; units in none get a card of their own."
        />
        <DialogBody className="min-h-0 flex-1 overflow-auto">
          {changes.map((change, index) => (
            <section key={change.id} className="flex flex-col gap-0.5">
              <ChangeEditorRow
                change={change}
                index={index}
                count={changes.length}
                isPicked={editor.changeIds.has(change.id)}
                hasPickedUnits={editor.unitIds.size > 0}
                isBusy={editor.isBusy}
                onToggle={() => editor.toggleChange(change.id)}
                onRename={(title) => editor.rename(change.id, title)}
                onMove={(delta) => editor.move(index, delta)}
                onMoveHere={() => editor.moveHere(change.id)}
                onUngroup={() => editor.ungroup(change.id)}
              />
              <div className="flex flex-col pl-5">
                {change.unitIds.flatMap((unitId) => {
                  const unit = byId.get(unitId);
                  return unit ? [pickRow(unit)] : [];
                })}
              </div>
            </section>
          ))}
          {changes.length === 0 ? (
            <p className="m-0 text-[13px] text-muted">
              No changes yet. Pick units below and name the change they make.
            </p>
          ) : null}
          <section className="flex flex-col gap-0.5">
            <SectionLabel>Not in a change · {loose.length}</SectionLabel>
            {loose.map(pickRow)}
          </section>
        </DialogBody>
        <div className="flex flex-col gap-2.5 border-t border-line bg-canvas px-5 py-3.5">
          <div className="flex items-center gap-2">
            <TextInput
              aria-label="New change name"
              placeholder="Name a new change, e.g. Retry policy"
              value={editor.title}
              onChange={(event) => editor.setTitle(event.target.value)}
            />
            <Button
              variant="primary"
              disabled={editor.isBusy || editor.unitIds.size === 0 || editor.title.trim() === ''}
              onClick={editor.create}
            >
              New change from {pluralize(editor.unitIds.size, 'unit')}
            </Button>
          </div>
          <DialogFooter className="justify-start">
            <Button disabled={editor.isBusy || editor.unitIds.size === 0} onClick={editor.takeOut}>
              Take picked units out
            </Button>
            <Button disabled={editor.isBusy || editor.changeIds.size < 2} onClick={editor.merge}>
              Merge {pluralize(editor.changeIds.size, 'picked change')}
            </Button>
            <span className="flex-1" />
            {hasDigest ? (
              <Button variant="ghost" disabled={editor.isBusy} onClick={editor.adoptDigest}>
                Start over from the digest
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
