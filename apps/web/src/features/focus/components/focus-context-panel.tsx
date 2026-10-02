import { useEffect, useRef } from 'react';

import { REVIEW_PROGRESSIONS } from '@chaff/common/enums/review.enums';
import type { ReviewProgression } from '@chaff/common/enums/review.enums';

import { EditIcon, RightIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SectionLabel } from '@~/components/ui/section-label';
import { DigestOverview } from '@~/features/digests/components/digest-overview';
import type { iDigest } from '@~/features/digests/digests.types';
import { readyContent } from '@~/features/digests/digests.utils';
import type { iFinding } from '@~/features/findings/findings.types';
import { cn } from '@~/lib/utils';

import { cardMark } from '../focus-cards.utils';
import type { iFocusCard } from '../focus-cards.utils';
import { REVIEW_PROGRESSION_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '../focus.enums';
import { ContextFindings } from './context-findings';

interface iFocusContextPanelProps {
  cards: readonly iFocusCard[];
  index: number;
  progression: ReviewProgression;
  findings: readonly iFinding[];
  /** Findings about the whole branch or stack written in this review. */
  branchFindings: readonly iFinding[];
  stackFindings: readonly iFinding[];
  digest: iDigest | undefined;
  onJump: (index: number) => void;
  onEditChanges: () => void;
  onClose: () => void;
}

/** Opened on demand: the digest's overview, notes on this card, this branch and the rest of the stack, and every card to jump between. */
export function FocusContextPanel({
  cards,
  index,
  progression,
  findings,
  branchFindings,
  stackFindings,
  digest,
  onJump,
  onEditChanges,
  onClose,
}: iFocusContextPanelProps) {
  const current = useRef<HTMLButtonElement>(null);
  const content = readyContent(digest);

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  return (
    <div className="flex w-[340px] flex-col gap-[22px] px-[18px] pt-[18px] pb-7">
      <div className="flex items-center justify-between">
        <SectionLabel>Context</SectionLabel>
        <Button variant="icon" size="icon" aria-label="Close context" onClick={onClose}>
          <RightIcon />
        </Button>
      </div>
      {digest && content ? <DigestOverview runner={digest.runner} content={content} /> : null}
      <ContextFindings title="Notes on this card" findings={findings} empty="None yet." />
      <ContextFindings title="Notes on this branch" findings={branchFindings} />
      <ContextFindings title="From the rest of the stack" findings={stackFindings} shouldShowBranch />
      <section className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between">
          <SectionLabel>{REVIEW_PROGRESSION_LABELS(progression)}</SectionLabel>
          {progression === REVIEW_PROGRESSIONS.changes ? (
            <Button variant="ghost" size="sm" onClick={onEditChanges}>
              <EditIcon />
              Edit changes
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col">
          {cards.map((card, cardIndex) => {
            const mark = cardMark(card);
            return (
              <button
                key={card.id}
                ref={cardIndex === index ? current : undefined}
                type="button"
                onClick={() => onJump(cardIndex)}
                className={cn(
                  'flex h-7 items-center gap-2 rounded-sm px-1.5 text-left text-[12.5px] hover:bg-hover',
                  cardIndex === index ? 'bg-raised text-fg' : 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'size-2 flex-none rounded-full bg-line-strong',
                    mark && UNIT_MARK_SEGMENT_CLASSES(mark),
                  )}
                />
                <span className={cn('min-w-0 flex-1 truncate', card.change && 'font-medium')}>{card.title}</span>
                {card.change ? (
                  <span className="font-mono text-[11px] text-faint">{card.units.length} units</span>
                ) : null}
                <span className="font-mono text-[11px] text-faint tabular-nums">{cardIndex + 1}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
