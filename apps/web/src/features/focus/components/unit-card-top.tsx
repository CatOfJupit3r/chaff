import { UNIT_KINDS } from '@chaff/common/enums/review.enums';

import { DiffStat } from '@~/features/reviews/components/diff-stat';
import { FilePath, FileStatusBadge } from '@~/features/reviews/components/file-status';
import type { iSnapshotFile, iUnit, iUnitDetail } from '@~/features/reviews/reviews.types';
import { formatRelativeTime } from '@~/utils/relative-time';

import { FILE_KIND_FACTS, SYMBOL_KIND_LABELS, UNIT_CHANGE_LABELS, UNIT_KIND_LABELS } from '../focus.enums';

interface iUnitCardTopProps {
  unit: iUnit;
  file: iSnapshotFile | undefined;
  lastCommit: iUnitDetail['lastCommit'];
}

function lineSpan(unit: iUnit) {
  const start = unit.newStartLine ?? unit.oldStartLine;
  const end = unit.newEndLine ?? unit.oldEndLine;
  if (start === undefined || end === undefined) return undefined;
  return start === end ? `line ${start}` : `lines ${start}–${end}`;
}

/** What the unit is, where it lives, and who last touched it. */
export function UnitCardTop({ unit, file, lastCommit }: iUnitCardTopProps) {
  const facts = [
    unit.symbolKind ? SYMBOL_KIND_LABELS(unit.symbolKind) : undefined,
    unit.isExported ? 'exported' : undefined,
    file ? FILE_KIND_FACTS(file.kind) : undefined,
    lineSpan(unit),
  ].filter((fact): fact is string => fact !== undefined);

  return (
    <div className="flex items-start gap-3 px-[22px] pt-5 pb-4">
      <div className="min-w-0">
        <span className="rounded-[4px] border border-line-strong px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase">
          {UNIT_KIND_LABELS(unit.kind)} · {UNIT_CHANGE_LABELS(unit.change)}
        </span>
        <h2
          className={
            unit.kind === UNIT_KINDS.FUNCTION
              ? 'mt-2 mb-0 font-mono text-[18px] font-medium break-all text-fg'
              : 'mt-2 mb-0 text-[19px] font-semibold tracking-[-0.015em] text-fg'
          }
        >
          {unit.title}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] text-muted">
          {file ? (
            <>
              <FilePath file={file} className="break-all" />
              <FileStatusBadge file={file} />
            </>
          ) : null}
          <DiffStat additions={unit.additions} deletions={unit.deletions} />
        </div>
        {facts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {facts.map((fact) => (
              <span key={fact} className="rounded-[5px] border border-line px-[7px] py-px text-[11.5px] text-muted">
                {fact}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {lastCommit ? (
        <div className="ml-auto flex-none text-right font-mono text-[12px] leading-[1.6] text-faint">
          {lastCommit.sha.slice(0, 7)}
          <br />
          by {lastCommit.author} · {formatRelativeTime(lastCommit.committedAt)}
        </div>
      ) : null}
    </div>
  );
}
