import { useQuery } from '@tanstack/react-query';

import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { Field } from '@~/components/ui/field';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@~/features/settings/hooks/use-update-settings';
import { workspacesQueryOptions } from '@~/features/workspaces/hooks/use-workspaces';

import { buildEditorFileUrl, joinRepoPath } from '../editor-links';
import { EDITOR_OPTIONS, EXAMPLE_FILE } from '../editor.constants';

interface iEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditorDialog({ isOpen, onOpenChange }: iEditorDialogProps) {
  const { editor } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const { data: workspaces } = useQuery(workspacesQueryOptions);
  const exampleRepoPath = workspaces?.[0]?.repoPath ?? '/path/to/repository';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title="Open in your editor"
          description="File names and line numbers become links into your editor. Saved on this computer."
        />
        <DialogBody>
          <Field label="Editor">
            <SegmentedControl
              label="Editor"
              options={EDITOR_OPTIONS}
              value={editor}
              onChange={(nextEditor) => updateSettings({ editor: nextEditor })}
            />
          </Field>
          <Field label="Example link">
            <div className="rounded-sm border border-line bg-canvas px-2.5 py-2 font-mono text-[12px] break-all text-accent">
              {buildEditorFileUrl(editor, joinRepoPath(exampleRepoPath, EXAMPLE_FILE.path), EXAMPLE_FILE.line)}
            </div>
          </Field>
          <Callout>
            Links open your working copy, not the snapshot you reviewed. If your checkout has moved on since, line
            numbers can be off.
          </Callout>
          <DialogFooter>
            <DialogClose render={<Button variant="primary" />}>Done</DialogClose>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
