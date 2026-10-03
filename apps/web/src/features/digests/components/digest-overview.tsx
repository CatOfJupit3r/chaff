import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { SectionLabel } from '@~/components/ui/section-label';

import type { iDigestContent } from '../digests.types';
import { InlineCodeText } from './inline-code-text';

interface iDigestOverviewProps {
  runner: DigestRunner;
  content: iDigestContent;
}

/** The digest's summary of the branch. */
export function DigestOverview({ runner, content }: iDigestOverviewProps) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Digest · {DIGEST_RUNNER_LABELS(runner)}</SectionLabel>
      <p className="m-0 text-[12.5px] leading-[1.6] text-fg-soft">
        <InlineCodeText text={content.overview} />
      </p>
      <p className="m-0 text-[11.5px] text-faint">Cards follow the digest&apos;s reading order.</p>
    </section>
  );
}
