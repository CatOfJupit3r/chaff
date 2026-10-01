import { useEffect, useRef } from 'react';

import { RightIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SectionLabel } from '@~/components/ui/section-label';
import type { iFinding } from '@~/features/findings/findings.types';
import type { iUnit } from '@~/features/reviews/reviews.types';
import { cn } from '@~/lib/utils';

import { UNIT_MARK_SEGMENT_CLASSES } from '../focus.enums';

interface iFocusContextPanelProps {
  units: readonly iUnit[];
  index: number;
  findings: readonly iFinding[];
  onJump: (index: number) => void;
  onClose: () => void;
}

/** Opened on demand: every unit of the review to jump between, and the notes already written on this one. */
export function FocusContextPanel({ units, index, findings, onJump, onClose }: iFocusContextPanelProps) {
  const current = useRef<HTMLButtonElement>(null);

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
      <section className="flex flex-col gap-2">
        <SectionLabel>Notes on this unit</SectionLabel>
        {findings.length === 0 ? <p className="m-0 text-[12.5px] text-muted">None yet.</p> : null}
        {findings.map((finding) => (
          <div key={finding.id} className="rounded-md border border-line px-3 py-2 text-[12.5px]">
            <span className="font-mono text-muted">F-{finding.number}</span>
            <p className="m-0 mt-1 whitespace-pre-wrap text-fg-soft">{finding.body}</p>
          </div>
        ))}
      </section>
      <section className="flex min-h-0 flex-col gap-2">
        <SectionLabel>Units in this review</SectionLabel>
        <div className="flex flex-col">
          {units.map((unit, unitIndex) => (
            <button
              key={unit.id}
              ref={unitIndex === index ? current : undefined}
              type="button"
              onClick={() => onJump(unitIndex)}
              className={cn(
                'flex h-7 items-center gap-2 rounded-sm px-1.5 text-left text-[12.5px] hover:bg-hover',
                unitIndex === index ? 'bg-raised text-fg' : 'text-muted',
              )}
            >
              <span
                className={cn(
                  'size-2 flex-none rounded-full bg-line-strong',
                  unit.mark && UNIT_MARK_SEGMENT_CLASSES(unit.mark),
                )}
              />
              <span className="min-w-0 flex-1 truncate">{unit.title}</span>
              <span className="font-mono text-[11px] text-faint tabular-nums">{unitIndex + 1}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
