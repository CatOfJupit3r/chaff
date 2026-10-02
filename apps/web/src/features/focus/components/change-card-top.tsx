import { CHANGE_UNIT_SOURCES } from '@chaff/common/enums/review.enums';

import { EditIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { FileStatusBadge } from '@~/features/reviews/components/file-status-badge';
import type { iSnapshotFile } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';

import type { iFocusCard } from '../focus-cards.utils';

interface iChangeCardTopProps {
  card: iFocusCard;
  files: readonly iSnapshotFile[];
  onEdit: () => void;
}

/** What the change is called, how much it spans, and where it came from. */
export function ChangeCardTop({ card, files, onEdit }: iChangeCardTopProps) {
  const fileIds = new Set(card.units.map((unit) => unit.fileId));
  const cardFiles = files.filter((file) => fileIds.has(file.id));
  const additions = card.units.reduce((total, unit) => total + unit.additions, 0);
  const deletions = card.units.reduce((total, unit) => total + unit.deletions, 0);
  const isFromDigest = card.change?.source === CHANGE_UNIT_SOURCES.DIGEST;

  return (
    <div className="flex items-start gap-3 px-[22px] pt-5 pb-4">
      <div className="min-w-0">
        <span className="rounded-[4px] border border-line-strong px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase">
          Change · {pluralize(card.units.length, 'unit')}
        </span>
        <h2 className="mt-2 mb-0 text-[19px] font-semibold tracking-[-0.015em] text-fg">{card.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] text-muted">
          <span>{pluralize(cardFiles.length, 'file')}</span>
          <DiffStat additions={additions} deletions={deletions} />
          <span className="text-faint">{isFromDigest ? 'grouped by the digest' : 'grouped by you'}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cardFiles.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1 rounded-[5px] border border-line px-[7px] py-px font-mono text-[11.5px] text-muted"
            >
              <FileStatusBadge file={file} className="text-[10.5px]" />
              {file.path}
            </span>
          ))}
        </div>
      </div>
      <Button variant="ghost" size="sm" className="ml-auto flex-none" onClick={onEdit}>
        <EditIcon />
        Edit changes
      </Button>
    </div>
  );
}
