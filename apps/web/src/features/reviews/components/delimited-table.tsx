import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

/** Rows and columns past these are left out so a large file stays quick to draw. */
const MAX_TABLE_ROWS = 500;
const MAX_TABLE_COLUMNS = 100;

interface iDelimitedTableProps {
  /** The first row is the heading. */
  rows: readonly string[][];
  /** Positions of rows the other version does not have. */
  changedRows: ReadonlySet<number>;
  /** Background for changed rows. */
  changedClassName: string;
}

/** One version of a CSV or TSV file as a table, with the rows the other version lacks tinted. */
export function DelimitedTable({ rows, changedRows, changedClassName }: iDelimitedTableProps) {
  const [heading = [], ...body] = rows;
  const shown = body.slice(0, MAX_TABLE_ROWS);
  const isWide = rows.some((row) => row.length > MAX_TABLE_COLUMNS);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="max-h-[60vh] overflow-auto rounded-md border border-line bg-surface">
        <table className="w-full border-collapse text-left font-mono text-code">
          <thead className="sticky top-0">
            <tr className={cn(changedRows.has(0) && changedClassName)}>
              {heading.slice(0, MAX_TABLE_COLUMNS).map((cell, index) => (
                // eslint-disable-next-line react/no-array-index-key -- columns have no identity besides their position
                <th key={index} className="border border-line bg-raised px-3 py-1.5 font-medium text-fg">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, rowIndex) => (
              // eslint-disable-next-line react/no-array-index-key -- rows have no identity besides their position
              <tr key={rowIndex} className={cn(changedRows.has(rowIndex + 1) && changedClassName)}>
                {row.slice(0, MAX_TABLE_COLUMNS).map((cell, cellIndex) => (
                  // eslint-disable-next-line react/no-array-index-key -- cells have no identity besides their position
                  <td key={cellIndex} className="border border-line px-3 py-1 whitespace-pre text-fg-soft">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {body.length > shown.length ? (
        <span className="text-[12px] text-muted">
          Showing the first {pluralize(shown.length, 'row')} of {body.length}.
        </span>
      ) : null}
      {isWide ? <span className="text-[12px] text-muted">Showing the first {MAX_TABLE_COLUMNS} columns.</span> : null}
    </div>
  );
}
