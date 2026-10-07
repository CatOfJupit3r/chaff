import { useMemo } from 'react';

import type { DiffLayout } from '@chaff/common/enums/diff.enums';

import { parseDelimited, unmatchedRows } from '../delimited.utils';
import { DelimitedTable } from './delimited-table';
import { PreviewSides } from './preview-sides';

const NO_ROWS: ReadonlySet<number> = new Set();

interface iTablePreviewProps {
  oldText: string | null;
  newText: string | null;
  delimiter: string;
  layout: DiffLayout;
}

/** A CSV or TSV file as tables before and after, with removed and added rows tinted. */
export function TablePreview({ oldText, newText, delimiter, layout }: iTablePreviewProps) {
  const { oldRows, newRows, removed, added } = useMemo(() => {
    const before = oldText === null ? undefined : parseDelimited(oldText, delimiter);
    const after = newText === null ? undefined : parseDelimited(newText, delimiter);
    return {
      oldRows: before,
      newRows: after,
      removed: before && after ? unmatchedRows(before, after) : NO_ROWS,
      added: before && after ? unmatchedRows(after, before) : NO_ROWS,
    };
  }, [oldText, newText, delimiter]);

  return (
    <PreviewSides
      layout={layout}
      before={
        oldRows ? <DelimitedTable rows={oldRows} changedRows={removed} changedClassName="bg-del-bg" /> : undefined
      }
      after={newRows ? <DelimitedTable rows={newRows} changedRows={added} changedClassName="bg-add-bg" /> : undefined}
    />
  );
}
