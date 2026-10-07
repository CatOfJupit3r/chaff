import { useState } from 'react';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import { SparkIcon, StopIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

import type { iDigest, iDigestPartRef } from '../digests.types';
import { partRevisions } from '../digests.utils';
import { useDigestRevisionActions } from '../hooks/use-digest-revision-actions';
import { PartVersionPicker } from './part-version-picker';
import { ReviseForm } from './revise-form';

interface iDigestPartControlsProps {
  digest: iDigest;
  partRef: iDigestPartRef;
}

/** Versions of one digest part, the rewrite in progress, and Improve, which asks the agent for a new version. */
export function DigestPartControls({ digest, partRef }: iDigestPartControlsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const actions = useDigestRevisionActions(digest, partRef);
  const revisions = partRevisions(digest, partRef);
  const running = revisions.find((revision) => revision.status === DIGEST_STATUSES.RUNNING);
  const latest = revisions.at(-1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-[26px] flex-wrap items-center gap-2 text-[12px] text-muted">
        <PartVersionPicker revisions={revisions} onSelect={actions.select} />
        {running ? (
          <>
            <span className="truncate">Rewriting{running.progress ? `: ${running.progress}` : '…'}</span>
            <Button variant="ghost" size="sm" onClick={() => actions.cancel(running.id)}>
              <StopIcon />
              Stop
            </Button>
          </>
        ) : null}
        {!running && latest?.status === DIGEST_STATUSES.FAILED ? (
          <span className="text-bad">Rewrite failed: {latest.error}</span>
        ) : null}
        {running || isFormOpen ? null : (
          <Button variant="ghost" size="sm" onClick={() => setIsFormOpen(true)}>
            <SparkIcon />
            Improve…
          </Button>
        )}
      </div>
      {isFormOpen ? (
        <ReviseForm
          part={partRef.part}
          isSaving={actions.isRevising}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={async (instructions) => {
            if (await actions.revise(instructions)) setIsFormOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
