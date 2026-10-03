import { DIFF_SIDES } from '@chaff/common/enums/review.enums';

import { SectionLabel } from '@~/components/ui/section-label';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import type { iDiffSearch } from '../reviews.types';

function Highlighted({ text, query }: { text: string; query: string }) {
  const start = text.toLowerCase().indexOf(query.toLowerCase());
  if (start === -1) return text;
  const end = start + query.length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-[2px] bg-accent-soft text-fg">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

interface iDiffSearchResultsProps {
  search: iDiffSearch;
  query: string;
  onSelect: (path: string) => void;
}

/** Changed lines that contain the filter text, grouped by file. */
export function DiffSearchResults({ search, query, onSelect }: iDiffSearchResultsProps) {
  const total = search.files.reduce((sum, file) => sum + file.matchCount, 0);
  if (total === 0) return null;

  return (
    <section aria-label="Matches in the changed code" className="mt-3 flex flex-col gap-1.5 px-1">
      <SectionLabel className="px-1">
        In the changed code · {pluralize(total, 'line')}
        {search.isTruncated ? '+' : ''}
      </SectionLabel>
      {search.files.map((file) => (
        <button
          key={file.fileId}
          type="button"
          onClick={() => onSelect(file.path)}
          className="flex flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left hover:bg-hover"
        >
          <span className="flex items-center gap-2 text-[12px]">
            <span className="min-w-0 flex-1 truncate font-mono text-fg">{file.path}</span>
            <span className="text-faint">{file.matchCount}</span>
          </span>
          {file.matches.map((match) => (
            <span key={`${match.side}:${match.line}`} className="flex gap-2 font-mono text-[11.5px] text-fg-soft">
              <span className="w-8 flex-none text-right text-faint">{match.line}</span>
              <span className={cn('w-2 flex-none', match.side === DIFF_SIDES.NEW ? 'text-good' : 'text-bad')}>
                {match.side === DIFF_SIDES.NEW ? '+' : '-'}
              </span>
              <span className="truncate whitespace-pre">
                <Highlighted text={match.text.trim()} query={query} />
              </span>
            </span>
          ))}
        </button>
      ))}
    </section>
  );
}
