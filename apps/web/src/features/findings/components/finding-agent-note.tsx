import { CODE_HOST_LABELS } from '@chaff/common/enums/code-host.enums';
import { FINDING_EVENT_SOURCES } from '@chaff/common/enums/review.enums';

import { formatRelativeTime } from '@~/utils/relative-time';

import type { iFinding } from '../findings.types';

/** What a coding agent reported about the finding, and where the finding was posted. */
export function FindingAgentNote({ finding }: { finding: iFinding }) {
  const reported = finding.events.findLast((event) => event.source === FINDING_EVENT_SOURCES.AGENT);
  if (!reported && !finding.post) return null;

  return (
    <section className="flex flex-col gap-2 border-t border-line px-5 py-4 text-[13px]">
      {reported ? (
        <div className="flex flex-col gap-1">
          <span className="text-[12.5px] text-muted">
            Agent report · {formatRelativeTime(reported.createdAt)}
            {reported.commits?.length ? (
              <span className="ml-1.5 font-mono">{reported.commits.map((sha) => sha.slice(0, 7)).join(', ')}</span>
            ) : null}
          </span>
          {reported.note && reported.note !== finding.answer ? (
            <p className="m-0 leading-relaxed whitespace-pre-wrap text-fg">{reported.note}</p>
          ) : null}
          <span className="text-[12px] text-faint">
            {reported.note === finding.answer ? 'The answer above came from the agent. ' : ''}Reported by the agent, not
            verified. Check the code above.
          </span>
        </div>
      ) : null}
      {finding.post ? (
        <span className="text-[12.5px] text-muted">
          Posted to {CODE_HOST_LABELS(finding.post.host)} as a draft {formatRelativeTime(finding.post.createdAt)}
        </span>
      ) : null}
    </section>
  );
}
