import { useState } from 'react';

import { CHANGE_REQUEST_NOUNS, CODE_HOST_LABELS, CODE_HOSTS } from '@chaff/common/enums/code-host.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { FINDING_KIND_LABELS } from '@chaff/common/enums/review.enums';

import { ExternalIcon } from '@~/components/icons/icons';
import { showToast } from '@~/components/toast/toast-store';
import { Button } from '@~/components/ui/button';
import { Callout } from '@~/components/ui/callout';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader } from '@~/components/ui/dialog';
import { changeLabel } from '@~/features/code-hosts/code-hosts.utils';
import { useOpenLink } from '@~/features/code-hosts/hooks/use-open-link';
import type { iSnapshot } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';

import type { iPostingItem, iPostingPreview } from '../exports.types';
import { usePostFindings } from '../hooks/use-post-findings';

function itemPlace(item: iPostingItem, noun: string) {
  if (item.isPosted) return 'Draft posted';
  if (item.line !== undefined) return `${item.path}:${item.line}`;
  return item.path ? `${item.path}, on the ${noun} (line not in the diff)` : `On the ${noun}`;
}

interface iPostingListProps {
  snapshot: iSnapshot;
  preview: iPostingPreview;
  statuses: FindingStatus[];
}

/** Where each finding would land, and the button that posts them as a draft after a confirmation. */
export function PostingList({ snapshot, preview, statuses }: iPostingListProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const post = usePostFindings();
  const openLink = useOpenLink();
  const { host } = preview;
  const noun = CHANGE_REQUEST_NOUNS.get(host);
  const change = changeLabel(host, preview.changeNumber);
  const pending = preview.items.filter((item) => !item.isPosted);
  const draftNoun = host === CODE_HOSTS.GITLAB ? pluralize(pending.length, 'draft note') : 'a pending review';
  const submit = () =>
    post.mutate(
      { snapshotId: snapshot.id, statuses },
      {
        onSuccess: (result) => {
          setIsConfirming(false);
          showToast(
            `Posted ${pluralize(result.postedCount, 'finding')} to ${change}. Publish them on ${CODE_HOST_LABELS.get(host)}.`,
          );
        },
      },
    );

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <p className="m-0 text-[13px] text-muted">
        {host === CODE_HOSTS.GITLAB
          ? `Each finding becomes a draft note on ${change}. Draft notes stay private until you submit your review in GitLab.`
          : `The findings become one pending review on ${change}. It stays private until you submit it on GitHub.`}
      </p>
      {preview.isSnapshotOnHost ? null : (
        <Callout variant="warn">
          {CODE_HOST_LABELS.get(host)} has no version of this {noun} at the reviewed commit, so comments go on the{' '}
          {noun} as a whole. Update the review to place them on lines.
        </Callout>
      )}
      <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-md border border-line p-0">
        {preview.items.map((item) => (
          <li key={item.findingId} className="flex items-center gap-3 px-3 py-2 text-[13px]">
            <span className="font-mono text-muted">F-{item.number}</span>
            <span className="text-fg">{FINDING_KIND_LABELS.get(item.kind)}</span>
            <span className="ml-auto truncate font-mono text-[12px] text-muted">{itemPlace(item, noun)}</span>
          </li>
        ))}
        {preview.items.length === 0 ? <li className="p-3 text-muted">No findings of this review match.</li> : null}
      </ul>
      <div className="flex items-center justify-end gap-2">
        {preview.webUrl ? (
          <Button variant="ghost" onClick={() => openLink(preview.webUrl ?? '')}>
            <ExternalIcon />
            Open {change}
          </Button>
        ) : null}
        <Button variant="primary" disabled={pending.length === 0} onClick={() => setIsConfirming(true)}>
          {pending.length === 0 && preview.items.length > 0
            ? 'All posted'
            : `Post ${pluralize(pending.length, 'finding')}`}
        </Button>
      </div>
      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent>
          <DialogHeader
            title={`Post ${pluralize(pending.length, 'finding')} to ${change}?`}
            description={`Chaff creates ${draftNoun} with your token. Nothing is published or submitted; you do that on ${CODE_HOST_LABELS.get(host)}.`}
          />
          <DialogBody>
            <DialogFooter>
              <DialogClose render={<Button />}>Cancel</DialogClose>
              <Button variant="primary" disabled={post.isPending} onClick={submit}>
                {post.isPending ? 'Posting...' : 'Post as draft'}
              </Button>
            </DialogFooter>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
