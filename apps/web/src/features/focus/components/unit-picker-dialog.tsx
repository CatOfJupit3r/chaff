import { useState } from 'react';

import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { UnitPickRow } from '@~/features/change-units/components/unit-pick-row';
import type { iSnapshotFile, iUnit } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';

interface iUnitPickerBodyProps {
  units: readonly iUnit[];
  files: readonly iSnapshotFile[];
  initialUnitIds: readonly string[];
  onPick: (unitIds: string[]) => void;
  onClose: () => void;
}

function UnitPickerBody({ units, files, initialUnitIds, onPick, onClose }: iUnitPickerBodyProps) {
  const [picked, setPicked] = useState(() => new Set(initialUnitIds));
  const toggle = (unitId: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(unitId)) next.add(unitId);
      return next;
    });

  return (
    <>
      <DialogHeader
        title="Pick the units this note is about"
        description="One note on several units, for feedback such as the same mistake made in three places."
      />
      <DialogBody className="min-h-0 flex-1 overflow-auto">
        <div className="flex flex-col">
          {units.map((unit) => (
            <UnitPickRow
              key={unit.id}
              unit={unit}
              path={files.find((file) => file.id === unit.fileId)?.path}
              isPicked={picked.has(unit.id)}
              onToggle={() => toggle(unit.id)}
            />
          ))}
        </div>
      </DialogBody>
      <DialogFooter className="border-t border-line bg-canvas px-5 py-3.5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={picked.size === 0}
          onClick={() => {
            onPick(units.filter((unit) => picked.has(unit.id)).map((unit) => unit.id));
            onClose();
          }}
        >
          Use {pluralize(picked.size, 'unit')}
        </Button>
      </DialogFooter>
    </>
  );
}

interface iUnitPickerDialogProps extends Omit<iUnitPickerBodyProps, 'onClose'> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Picks the units a concern or question is about, from any card of the review. */
export function UnitPickerDialog({ isOpen, onOpenChange, ...body }: iUnitPickerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(640px,100%)] flex-col overflow-hidden">
        {isOpen ? <UnitPickerBody {...body} onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
