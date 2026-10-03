import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { DIFF_LAYOUT_LABELS, DIFF_LAYOUTS, diffLayoutValues } from '@chaff/common/enums/diff.enums';
import type { DiffLayout } from '@chaff/common/enums/diff.enums';
import { ANCHOR_MATCHES, DIFF_SIDES } from '@chaff/common/enums/review.enums';

import { Callout } from '@~/components/ui/callout';
import { SegmentedControl } from '@~/components/ui/segmented-control';
import { ContentsDiff } from '@~/features/reviews/components/contents-diff';
import { spliceLines } from '@~/features/reviews/contents-splice.utils';
import { tanstackRPC } from '@~/utils/tanstack-orpc';

import type { iAnchorComparison } from '../findings.types';

type iAnchorText = NonNullable<iAnchorComparison['after']>;

const shortSha = (sha: string) => sha.slice(0, 7);

/** The code as it was when the finding was raised against the code now, inside the file as it is now. */
function ProposedFix({ comparison, after }: { comparison: iAnchorComparison; after: iAnchorText }) {
  const [layout, setLayout] = useState<DiffLayout>(DIFF_LAYOUTS.unified);
  const contents = useQuery(
    tanstackRPC.reviews.fileContents.queryOptions({
      input: { snapshotId: after.snapshotId, fileId: after.fileId ?? '' },
      staleTime: Infinity,
      enabled: after.fileId !== undefined,
    }),
  ).data;
  const current = comparison.side === DIFF_SIDES.NEW ? contents?.newContents : contents?.oldContents;
  const isInFile = typeof current === 'string' && after.startLine !== undefined;
  const newContents = isInFile ? current : after.text;
  const oldContents = isInFile
    ? spliceLines(current, after.startLine ?? 1, after.endLine ?? 0, comparison.before.text)
    : comparison.before.text;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2.5 text-[12.5px] text-muted">
        <b className="font-medium text-fg">Proposed fix</b>
        <span className="font-mono">
          {shortSha(comparison.before.headSha)} → {shortSha(after.headSha)}
        </span>
        <span>
          version {comparison.before.version} to {after.version}
        </span>
        <SegmentedControl
          label="Layout"
          className="ml-auto"
          options={diffLayoutValues.map((value) => ({ value, label: DIFF_LAYOUT_LABELS(value) }))}
          value={layout}
          onChange={setLayout}
        />
      </div>
      <span className="self-start rounded-full border border-accent-line px-2.5 py-0.5 text-[12px] text-accent">
        Chaff saw this code change since you raised it. Check it before you verify.
      </span>
      <div className="overflow-hidden rounded-md border border-line">
        {contents === undefined && after.fileId !== undefined ? null : (
          <ContentsDiff path={comparison.path} oldContents={oldContents} newContents={newContents} layout={layout} />
        )}
      </div>
    </div>
  );
}

/** What happened to the anchored code in the newest version: changed, unchanged, or lost. */
export function FindingAnchorChange({ comparison }: { comparison: iAnchorComparison | undefined }) {
  const after = comparison?.after;
  if (!comparison || !after) return null;
  if (after.match === ANCHOR_MATCHES.UNMATCHED) {
    return (
      <Callout variant="warn">
        Chaff could not find this code in version {after.version} ({shortSha(after.headSha)}) with confidence. If the
        fix removed it, verify it; otherwise reopen or withdraw it.
      </Callout>
    );
  }
  if (after.match === ANCHOR_MATCHES.EXACT) {
    return (
      <p className="m-0 text-[12.5px] text-muted">
        Unchanged in version {after.version} ({shortSha(after.headSha)})
        {after.startLine === undefined ? '' : `, now at line ${after.startLine}`}.
      </p>
    );
  }
  return <ProposedFix comparison={comparison} after={after} />;
}
