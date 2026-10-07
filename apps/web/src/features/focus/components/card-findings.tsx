import { useState } from 'react';

import { DiscussionSummary } from '@~/features/findings/components/discussion-summary';
import { FindingDiscussion } from '@~/features/findings/components/finding-discussion';
import type { iFinding } from '@~/features/findings/findings.types';

/** A finding written on what the card shows; its discussion opens in place. */
function CardFinding({ finding }: { finding: iFinding }) {
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px]">
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-muted">F-{finding.number}</span>
        <span className="min-w-0 flex-1 whitespace-pre-wrap text-fg-soft">{finding.body}</span>
      </div>
      <DiscussionSummary
        finding={finding}
        isOpen={isDiscussionOpen}
        onToggle={() => setIsDiscussionOpen(!isDiscussionOpen)}
      />
      {isDiscussionOpen ? <FindingDiscussion finding={finding} className="pt-1.5" /> : null}
    </div>
  );
}

/** The findings already written on what the card shows. */
export function CardFindings({ findings }: { findings: readonly iFinding[] }) {
  return findings.map((finding) => <CardFinding key={finding.id} finding={finding} />);
}
