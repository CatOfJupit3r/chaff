import { CHANGE_REQUEST_NOUNS } from '@chaff/common/enums/code-host.enums';
import { ONBOARDING_ITEMS } from '@chaff/common/enums/onboarding.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';

import { CopyIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { reportGuideAction } from '@~/features/onboarding/guide-action-events';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { useCopyText } from '@~/hooks/use-copy-text';

import { exportTabLabel } from '../export.utils';
import { EXPORT_TABS, IS_POSTING_TAB, exportTabsEnumwaii } from '../exports.enums';
import type { ExportTab } from '../exports.enums';
import type { iExportPacket } from '../exports.types';
import { PacketText } from './packet-text';
import { PostingView } from './posting-view';

interface iExportPreviewProps {
  snapshot: iSnapshot;
  packet: iExportPacket | undefined;
  statuses: FindingStatus[];
  tab: ExportTab;
  onTab: (tab: ExportTab) => unknown;
}

function packetText(packet: iExportPacket | undefined, tab: ExportTab) {
  if (!packet) return '';
  if (tab === EXPORT_TABS.json) return packet.json;
  if (tab === EXPORT_TABS['agent-prompt']) return packet.agentPrompt;
  return packet.markdown;
}

/** The packet in the chosen format with a copy button, or how it would be posted to the merge request. */
export function ExportPreview({ snapshot, packet, statuses, tab, onTab }: iExportPreviewProps) {
  const copy = useCopyText();
  const host = snapshot.change?.host;
  const tabs = exportTabsEnumwaii.values
    .filter((value) => host !== undefined || !IS_POSTING_TAB.get(value))
    .map((value) => ({ value, label: exportTabLabel(value, host) }));
  const isPosting = host !== undefined && IS_POSTING_TAB.get(tab);
  const text = packetText(packet, tab);

  return (
    <section
      aria-label="Export preview"
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <SegmentedControl label="Format" options={tabs} value={tab} onChange={onTab} />
        {isPosting ? null : (
          <Button
            size="sm"
            disabled={!text}
            data-onboarding={ONBOARDING_ITEMS.OUTPUT}
            onClick={async () => {
              reportGuideAction(ONBOARDING_ITEMS.OUTPUT);
              await copy(text);
            }}
          >
            <CopyIcon />
            Copy
          </Button>
        )}
      </div>
      {isPosting ? (
        <PostingView snapshot={snapshot} host={host} statuses={statuses} tab={tab} />
      ) : (
        <PacketText text={text} className="max-h-[calc(100vh-260px)]" />
      )}
      {!isPosting && packet?.findingCount === 0 ? (
        <p className="m-0 border-t border-line px-5 py-3 text-[12.5px] text-muted">
          No findings match. Include more statuses, or widen the scope
          {host ? ` beyond this ${CHANGE_REQUEST_NOUNS.get(host)}` : ''}.
        </p>
      ) : null}
    </section>
  );
}
