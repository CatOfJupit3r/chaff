import { cn } from '@~/lib/utils';

import { UNIT_KIND_LABELS, UNIT_MARK_LABELS, UNIT_MARK_SEGMENT_CLASSES } from '../focus.enums';
import { AREA_LEGEND_INDENT_PX, AREA_SWATCH_CLASSES } from '../unit-areas.constants';
import type { iUnitArea } from '../unit-areas.utils';

/** The units outlined in a file's code, each with its outline color, nested under the unit it sits in. */
export function UnitAreaLegend({ areas }: { areas: readonly iUnitArea[] }) {
  return (
    <ul
      aria-label="Units in this file"
      className="m-0 flex list-none flex-col gap-1 border-t border-line px-[22px] pt-3 pb-2"
    >
      {areas.map(({ unit, depth, color }) => (
        <li
          key={unit.id}
          className="flex items-center gap-2 text-[12.5px]"
          style={{ paddingLeft: depth * AREA_LEGEND_INDENT_PX }}
        >
          <span className={cn('h-3.5 w-1 flex-none rounded-full', AREA_SWATCH_CLASSES[color - 1])} />
          <span
            className={cn(
              'size-2 flex-none rounded-full bg-line-strong',
              unit.mark && UNIT_MARK_SEGMENT_CLASSES.get(unit.mark),
            )}
          />
          <span className="text-faint">{UNIT_KIND_LABELS.get(unit.kind)}</span>
          <span className="min-w-0 truncate font-mono text-fg">{unit.title}</span>
          {unit.mark ? <span className="ml-auto flex-none text-muted">{UNIT_MARK_LABELS.get(unit.mark)}</span> : null}
        </li>
      ))}
    </ul>
  );
}
