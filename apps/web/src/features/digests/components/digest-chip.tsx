import { useState } from 'react';

import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import { SparkIcon, StopIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';

import { digestAuthor } from '../digests.utils';
import { useDigest } from '../hooks/use-digest';
import { useDigestActions } from '../hooks/use-digest-actions';
import { DigestRunDialog } from './digest-run-dialog';

/** The digest's state in the top bar: write one, watch it being written, stop it, or write it again. */
export function DigestChip({ snapshotId }: { snapshotId: string }) {
  const digest = useDigest(snapshotId);
  const actions = useDigestActions(snapshotId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isRunning = digest?.status === DIGEST_STATUSES.RUNNING;

  return (
    <>
      {isRunning ? (
        <span className="inline-flex h-[26px] max-w-[320px] items-center gap-2 rounded-full border border-accent-line bg-accent-soft pr-1 pl-2.5 text-[12px] text-accent">
          <span aria-hidden="true" className="size-1.5 flex-none animate-pulse rounded-full bg-accent" />
          <span className="truncate" title={digest.progress}>
            {digestAuthor(digest)} ·{' '}
            {digest.preview
              ? `${digest.preview.noteCount} of ${digest.preview.unitCount} notes`
              : (digest.progress ?? 'starting')}
          </span>
          <button
            type="button"
            aria-label="Stop the digest"
            title="Stop"
            onClick={() => actions.cancel(digest.id)}
            className="grid size-5 flex-none place-items-center rounded-full hover:bg-hover"
          >
            <StopIcon className="size-3" />
          </button>
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={actions.isStarting}
          title={digest?.status === DIGEST_STATUSES.FAILED ? digest.error : undefined}
          onClick={() => setIsDialogOpen(true)}
          className={digest?.status === DIGEST_STATUSES.FAILED ? 'text-bad' : undefined}
        >
          <SparkIcon />
          {digest?.status === DIGEST_STATUSES.READY ? 'Digest ready' : null}
          {digest?.status === DIGEST_STATUSES.FAILED ? 'Digest failed' : null}
          {!digest || digest.status === DIGEST_STATUSES.CANCELLED ? 'AI digest' : null}
        </Button>
      )}
      <DigestRunDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} onStart={actions.start} />
    </>
  );
}
