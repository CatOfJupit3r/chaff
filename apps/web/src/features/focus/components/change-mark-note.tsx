import { Pill } from '@~/components/ui/pill';
import { pluralize } from '@~/utils/pluralize';

import { cardMark } from '../focus-cards.utils';
import type { iFocusCard } from '../focus-cards.utils';
import { tallyMarks } from '../focus-queue.utils';
import { UNIT_MARK_LABELS } from '../focus.enums';

interface iChangeMarkNoteProps {
  card: iFocusCard;
  headSha: string;
  hasFindings: boolean;
}

/** The decision on a change: one its units share, or how far apart they are. */
export function ChangeMarkNote({ card, headSha, hasFindings }: iChangeMarkNoteProps) {
  const mark = cardMark(card);
  const tally = tallyMarks(card.units);
  if (!mark && tally.untouched === card.units.length) return null;

  const parts = [
    tally.looksGood > 0 ? `${tally.looksGood} looks good` : undefined,
    tally.concerns > 0 ? pluralize(tally.concerns, 'concern') : undefined,
    tally.questions > 0 ? pluralize(tally.questions, 'question') : undefined,
    tally.later > 0 ? `${tally.later} later` : undefined,
    tally.untouched > 0 ? `${tally.untouched} without a decision` : undefined,
  ].filter((part): part is string => part !== undefined);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-canvas px-[22px] py-[9px] text-[12.5px] text-muted">
      <Pill variant="neutral">{mark ? UNIT_MARK_LABELS(mark) : 'Mixed'}</Pill>
      <span>
        {mark ? `You decided this on ${headSha.slice(0, 7)}.` : `Its units differ: ${parts.join(', ')}.`}
        {hasFindings ? ' Its findings stay in Findings if you change your mind.' : ''} A decision here applies to all{' '}
        {pluralize(card.units.length, 'unit')}.
      </span>
    </div>
  );
}
