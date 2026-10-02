import { SectionLabel } from '@~/components/ui/section-label';
import { pluralize } from '@~/utils/pluralize';

import type { iDigest } from '../digests.types';
import { digestAuthor } from '../digests.utils';
import { InlineCodeText } from './inline-code-text';

/** What the digest has written so far, while the agent is still writing it. */
export function DigestPreview({ digest }: { digest: iDigest }) {
  const { preview } = digest;

  return (
    <section className="flex flex-col gap-2" aria-live="polite">
      <SectionLabel className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-accent" />
        Digest · {digestAuthor(digest)} · writing
      </SectionLabel>
      {preview ? (
        <>
          <p className="m-0 text-[12.5px] leading-[1.6] text-fg-soft">
            <InlineCodeText text={preview.overview} />
          </p>
          {preview.groupTitles.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px] text-fg">
              {preview.groupTitles.map((title, index) => (
                // Titles are still being written, so only their position is stable.
                // eslint-disable-next-line react/no-array-index-key
                <li key={index} className="truncate">
                  <InlineCodeText text={title} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="m-0 font-mono text-[11.5px] text-faint tabular-nums">
            {preview.noteCount} of {pluralize(preview.unitCount, 'unit note')}
            {preview.diagramCount > 0 ? ` · ${pluralize(preview.diagramCount, 'diagram')}` : ''}
          </p>
        </>
      ) : (
        <p className="m-0 text-[12.5px] text-muted">{digest.progress ?? 'Starting the agent'}</p>
      )}
    </section>
  );
}
