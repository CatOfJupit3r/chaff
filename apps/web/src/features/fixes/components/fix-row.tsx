import { useState } from 'react';

import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import { FIX_STATUS_LABELS, FIX_STATUSES } from '@chaff/common/enums/fix.enums';
import { FINDING_STATUS_LABELS } from '@chaff/common/enums/review.enums';

import { Button } from '@~/components/ui/button';
import { Pill } from '@~/components/ui/pill';
import { useOpenLink } from '@~/features/code-hosts/hooks/use-open-link';
import { buildEditorFolderUrl } from '@~/features/editor/editor-links';
import { useSettings } from '@~/features/settings/hooks/use-settings';
import { useCopyText } from '@~/hooks/use-copy-text';
import { pluralize } from '@~/utils/pluralize';
import { formatRelativeTime } from '@~/utils/relative-time';

import { FIX_STATUS_PILLS } from '../fixes.enums';
import type { iFix } from '../fixes.types';
import { findingLabels } from '../fixes.utils';
import { FixChangesDialog } from './fix-changes-dialog';

interface iFixRowProps {
  fix: iFix;
  onCancel: (fixId: string) => void;
  onDiscard: (fixId: string) => void;
}

/** One hand-off: what the agent is doing or did, the files it changed, and how to take the fix. */
export function FixRow({ fix, onCancel, onDiscard }: iFixRowProps) {
  const [isShowingChanges, setIsShowingChanges] = useState(false);
  const { editor } = useSettings();
  const openLink = useOpenLink();
  const copyText = useCopyText();
  const isRunning = fix.status === FIX_STATUSES.RUNNING;
  const additions = fix.files.reduce((sum, file) => sum + file.additions, 0);
  const deletions = fix.files.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="flex flex-col gap-2.5 border-t border-line px-4 py-3.5 text-[13px] first:border-t-0">
      <div className="flex items-center gap-2.5">
        <Pill variant={FIX_STATUS_PILLS.get(fix.status)}>{FIX_STATUS_LABELS.get(fix.status)}</Pill>
        <span className="font-medium text-fg">{DIGEST_RUNNER_LABELS.get(fix.runner)}</span>
        <span className="font-mono text-[12px] text-muted">{findingLabels(fix.findingNumbers)}</span>
        <span className="ml-auto text-[12px] text-faint">{formatRelativeTime(fix.startedAt)}</span>
      </div>
      {isRunning ? <p className="m-0 truncate text-muted">{fix.progress ?? 'Working...'}</p> : null}
      {fix.error ? <p className="m-0 text-bad">{fix.error}</p> : null}
      {fix.files.length > 0 ? (
        <p className="m-0 font-mono text-[12px] text-muted">
          {pluralize(fix.files.length, 'file')} changed on {fix.branch} <span className="text-good">+{additions}</span>{' '}
          <span className="text-bad">-{deletions}</span>
        </p>
      ) : null}
      {fix.report?.applied.map((item) => (
        <p key={item.findingId} className="m-0 text-fg">
          <span className="font-mono text-muted">F-{item.number}</span> is now {FINDING_STATUS_LABELS.get(item.status)}
        </p>
      ))}
      {fix.summary ? (
        <details className="text-muted">
          <summary className="cursor-pointer text-[12.5px]">The agent&apos;s reply</summary>
          <p className="m-0 mt-1.5 max-h-60 overflow-auto leading-relaxed whitespace-pre-wrap">{fix.summary}</p>
        </details>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {isRunning ? (
          <Button size="sm" onClick={() => onCancel(fix.id)}>
            Stop
          </Button>
        ) : (
          <>
            <Button size="sm" disabled={fix.files.length === 0} onClick={() => setIsShowingChanges(true)}>
              Show changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={fix.files.length === 0}
              onClick={async () =>
                copyText(fix.fetchCommand, 'Copied. Run it in a terminal to get the fix as a branch.')
              }
            >
              Copy fetch command
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openLink(buildEditorFolderUrl(editor, fix.checkoutPath))}>
              Open checkout
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onDiscard(fix.id)}>
              Discard
            </Button>
          </>
        )}
      </div>
      <FixChangesDialog fix={fix} isOpen={isShowingChanges} onOpenChange={setIsShowingChanges} />
    </div>
  );
}
