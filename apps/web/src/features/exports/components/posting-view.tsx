import { CHANGE_REQUEST_NOUNS, CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import type { CodeHost } from '@chaff/common/enums/code-host.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { CopyIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { useCopyText } from '@~/hooks/use-copy-text';
import { getErrorMessage } from '@~/utils/rpc-errors';

import { EXPORT_TABS } from '../exports.enums';
import type { ExportTab } from '../exports.enums';
import { usePostingPreview } from '../hooks/use-posting-preview';
import { PacketText } from './packet-text';
import { PostingList } from './posting-list';

interface iPostingViewProps {
  snapshot: iSnapshot;
  host: CodeHost;
  statuses: FindingStatus[];
  tab: ExportTab;
}

/** The findings as they would be posted, or the same posts as `glab`/`gh` and curl commands. */
export function PostingView({ snapshot, host, statuses, tab }: iPostingViewProps) {
  const preview = usePostingPreview(snapshot.id, statuses);
  const copy = useCopyText();
  if (preview.error) {
    return (
      <div className="p-5">
        <Callout variant="warn">{getErrorMessage(preview.error)}</Callout>
      </div>
    );
  }
  if (!preview.data) return <p className="m-0 px-5 py-4 text-muted">Asking {CODE_HOST_LABELS.get(host)}...</p>;
  if (tab === EXPORT_TABS.post) return <PostingList snapshot={snapshot} preview={preview.data} statuses={statuses} />;

  const command = tab === EXPORT_TABS.cli ? preview.data.cliCommand : preview.data.curlCommand;
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 text-[12.5px] text-muted">
        <span>
          {command
            ? `The same draft as commands you run yourself. Nothing is published until you submit the review on ${CODE_HOST_LABELS.get(host)}.`
            : `Every chosen finding is already posted to this ${CHANGE_REQUEST_NOUNS.get(host)}.`}
        </span>
        <Button size="sm" disabled={!command} onClick={async () => copy(command)}>
          <CopyIcon />
          Copy
        </Button>
      </div>
      <PacketText text={command} className="max-h-[calc(100vh-300px)]" />
    </div>
  );
}
