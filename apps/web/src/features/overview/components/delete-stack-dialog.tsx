import { showToast } from '@~/components/toast/toast-store';
import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { pluralize } from '@~/utils/pluralize';

import type { useStackList } from '../hooks/use-stack-list';
import type { iOverviewStack } from '../overview.types';

interface iDeleteStackDialogProps extends Pick<ReturnType<typeof useStackList>, 'deleteStack' | 'isDeleting'> {
  /** The stack to delete; unset while the dialog is closed. */
  stack: Pick<iOverviewStack, 'id' | 'title' | 'branches'> | undefined;
  onClose: () => unknown;
}

export function DeleteStackDialog({ stack, deleteStack, isDeleting, onClose }: iDeleteStackDialogProps) {
  const confirm = () => {
    if (!stack) return;
    deleteStack(stack, () => {
      onClose();
      showToast(`Deleted ${stack.title}`);
    });
  };

  return (
    <Dialog
      open={stack !== undefined}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        {stack ? (
          <DialogHeader
            title={`Delete ${stack.title}?`}
            description={`Chaff deletes this stack and the reviews of its ${pluralize(stack.branches.length, 'branch', 'branches')}, with their findings and fixes. The branches in the repository are not touched.`}
          />
        ) : null}
        <DialogBody>
          <DialogFooter>
            <DialogClose render={<Button />}>Cancel</DialogClose>
            <Button variant="primary" onClick={confirm} disabled={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
