import { showToast } from '@~/components/toast/toast-store';
import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';

import { useRemoveWorkspace } from '../hooks/use-remove-workspace';
import type { iWorkspace } from '../workspaces.types';

interface iRemoveRepositoryDialogProps {
  workspace: iWorkspace;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function RemoveRepositoryDialog({ workspace, isOpen, onOpenChange }: iRemoveRepositoryDialogProps) {
  const { mutate: removeWorkspace, isPending } = useRemoveWorkspace();

  const confirm = () =>
    removeWorkspace(
      { workspaceId: workspace.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          showToast(`Removed ${workspace.name}`);
        },
      },
    );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title={`Remove ${workspace.name}?`}
          description="Chaff forgets this repository and its reviews. The folder on disk is not touched."
        />
        <DialogBody>
          <DialogFooter>
            <DialogClose render={<Button />}>Cancel</DialogClose>
            <Button variant="primary" onClick={confirm} disabled={isPending}>
              Remove
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
