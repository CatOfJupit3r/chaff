import { useState } from 'react';

import { Button } from '@~/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import type { iFinding } from '@~/features/findings/findings.types';

import { usePreferenceActions } from '../hooks/use-preference-actions';
import { usePreferences } from '../hooks/use-preferences';
import { PreferenceTextField } from './preference-text-field';

/** Turns a finding into a project preference, worded as a rule; never done for you. */
export function PromoteFindingButton({ finding }: { finding: iFinding }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState(finding.body);
  const preferences = usePreferences(finding.workspaceId);
  const actions = usePreferenceActions(finding.workspaceId);
  const isPromoted = preferences.some((preference) => preference.findingId === finding.id);
  const open = () => {
    setText(finding.body);
    setIsOpen(true);
  };

  return (
    <>
      <Button variant="ghost" size="sm" disabled={isPromoted} onClick={open}>
        {isPromoted ? 'Preference' : 'Make preference'}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[min(560px,100%)]">
          <DialogHeader
            title={`Make F-${finding.number} a project preference`}
            description="Word it as a rule for this repository. Preferences go into AI digests and agent prompts, and export as a CLAUDE.md snippet from Settings."
          />
          <DialogBody>
            <PreferenceTextField value={text} onChange={(event) => setText(event.target.value)} />
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button
                variant="primary"
                disabled={!text.trim() || actions.isSaving}
                onClick={() => actions.create(text.trim(), finding.id, () => setIsOpen(false))}
              >
                Save preference
              </Button>
            </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
