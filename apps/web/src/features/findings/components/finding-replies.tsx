import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import { FINDING_STATUSES } from '@chaff/common/enums/review.enums';
import type { FindingStatus } from '@chaff/common/enums/review.enums';
import { manualFindingStatuses } from '@chaff/common/helpers/finding-transitions.helper';

import { ExternalIcon } from '@~/components/icons/icons';
import { MarkdownBody } from '@~/components/markdown/markdown-body';
import { Button } from '@~/components/ui/button';
import { useOpenLink } from '@~/features/code-hosts/hooks/use-open-link';
import { formatRelativeTime } from '@~/utils/relative-time';

import type { iFinding } from '../findings.types';
import { usePullReplies } from '../hooks/use-pull-replies';

interface iFindingRepliesProps {
  finding: iFinding;
  isPending: boolean;
  onSetStatus: (status: FindingStatus, answer?: string) => void;
}

/** Where the finding was posted and what people answered on the host; an answer to a question can be taken over. */
export function FindingReplies({ finding, isPending, onSetStatus }: iFindingRepliesProps) {
  const pullReplies = usePullReplies();
  const openLink = useOpenLink();
  const { post } = finding;
  if (!post) return null;
  const canAnswer = manualFindingStatuses(finding.kind, finding.status).includes(FINDING_STATUSES.ANSWERED);

  return (
    <section className="flex flex-col gap-2.5 border-t border-line px-5 py-4 text-[13px]">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
        <span>
          Posted to {CODE_HOST_LABELS.get(post.host)} as a draft {formatRelativeTime(post.createdAt)}
        </span>
        <span className="ml-auto flex gap-1.5">
          {post.url ? (
            <Button variant="ghost" size="sm" onClick={() => openLink(post.url ?? '')}>
              <ExternalIcon />
              Open
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={pullReplies.isPending}
            onClick={() => pullReplies.mutate({ snapshotId: finding.snapshotId })}
          >
            {pullReplies.isPending ? 'Checking…' : 'Check for replies'}
          </Button>
        </span>
      </div>
      {finding.replies.map((reply) => (
        <div key={reply.remoteId} className="flex flex-col gap-1 border-l-2 border-line-strong pl-3">
          <span className="flex items-center gap-2 text-[12.5px] text-muted">
            <b className="font-medium text-fg">{reply.authorName}</b>
            {formatRelativeTime(reply.createdAt)}
            {canAnswer ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={isPending}
                onClick={() => onSetStatus(FINDING_STATUSES.ANSWERED, reply.body)}
              >
                Use as answer
              </Button>
            ) : null}
          </span>
          <MarkdownBody text={reply.body} baseUrl={post.url ?? undefined} />
        </div>
      ))}
    </section>
  );
}
