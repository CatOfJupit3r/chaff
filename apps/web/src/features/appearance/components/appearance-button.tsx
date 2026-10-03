import { useState } from 'react';

import { SunIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

import { AppearanceDialog } from './appearance-dialog';

export function AppearanceButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="icon" size="icon" aria-label="Appearance" title="Appearance" onClick={() => setIsOpen(true)}>
        <SunIcon />
      </Button>
      <AppearanceDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
