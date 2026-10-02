import { SectionLabel } from '@~/components/ui/section-label';
import { pluralize } from '@~/utils/pluralize';

import type { iDigest, iDigestContent } from '../digests.types';
import { digestAuthor } from '../digests.utils';
import { InlineCodeText } from './inline-code-text';

interface iDigestOverviewProps {
  digest: iDigest;
  content: iDigestContent;
}

/** The digest's summary of the branch, and the agent and model that wrote it. */
export function DigestOverview({ digest, content }: iDigestOverviewProps) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Digest · {digestAuthor(digest)}</SectionLabel>
      <p className="m-0 text-[12.5px] leading-[1.6] text-fg-soft">
        <InlineCodeText text={content.overview} />
      </p>
      {content.outlinedPaths.length > 0 ? (
        <p className="m-0 text-[11.5px] text-muted" title={content.outlinedPaths.join('\n')}>
          The branch was too large to send whole, so {pluralize(content.outlinedPaths.length, 'file')} went as an
          outline the agent read in the checkout.
        </p>
      ) : null}
      <p className="m-0 text-[11.5px] text-faint">Cards follow the digest&apos;s reading order.</p>
    </section>
  );
}
