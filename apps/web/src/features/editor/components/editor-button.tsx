import { useState } from 'react';

import { EDITOR_LABELS } from '@chaff/common/enums/editors.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { useSettings } from '@~/features/settings/hooks/use-settings';

import { EditorDialog } from './editor-dialog';

export function EditorButton() {
  const { editor } = useSettings();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title="Editor links"
        className="min-w-24 justify-start"
        onClick={() => setIsOpen(true)}
      >
        <ExternalIcon />
        {EDITOR_LABELS.get(editor)}
      </Button>
      <EditorDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
