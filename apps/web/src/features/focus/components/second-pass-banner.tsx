import { Link } from '@tanstack/react-router';

import { Button } from '@~/components/ui/button';
import { FINDING_FILTERS } from '@~/features/findings/findings.enums';
import type { iFinding } from '@~/features/findings/findings.types';
import { summarizeRelocations } from '@~/features/findings/findings.utils';
import type { iSnapshot, iUnit } from '@~/features/reviews/reviews.types';
import { pluralize } from '@~/utils/pluralize';

import { tallyRevisions } from '../focus-queue.utils';

interface iSecondPassBannerProps {
  snapshot: iSnapshot;
  units: readonly iUnit[];
  findings: readonly iFinding[];
  onRecheck: () => void;
}

/** After an update: what changed since the previous version, what kept its decision, and how the concerns fared. */
export function SecondPassBanner({ snapshot, units, findings, onRecheck }: iSecondPassBannerProps) {
  const revisions = tallyRevisions(units);
  const relocations = summarizeRelocations(findings, snapshot.id);
  if (snapshot.version < 2) return null;

  const unitFacts = [
    `${revisions.edited} edited`,
    `${revisions.added} new`,
    `${revisions.possiblyAffected} possibly affected`,
    `${revisions.kept} kept their decision`,
  ];
  const concernFacts = [
    `${relocations.changed} fix proposed`,
    `${relocations.unchanged} unchanged`,
    `${relocations.unmatched} unmatched`,
  ];

  return (
    <section
      aria-label="Second pass"
      className="mb-4 flex w-full max-w-[920px] flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[12.5px] text-muted"
    >
      <span className="font-medium text-fg">Version {snapshot.version}</span>
      <span>{unitFacts.join(' · ')}</span>
      {relocations.concerns > 0 ? (
        <span>
          {pluralize(relocations.concerns, 'concern')}: {concernFacts.join(', ')}
        </span>
      ) : null}
      <span className="ml-auto flex gap-1.5">
        {revisions.recheck > 0 ? (
          <Button size="sm" onClick={onRecheck}>
            Recheck {revisions.recheck}
          </Button>
        ) : null}
        {relocations.concerns > 0 ? (
          <Link
            to="/findings"
            search={{ filter: FINDING_FILTERS['fix-proposed'] }}
            className="inline-flex h-[26px] items-center rounded-sm border border-line-strong bg-surface px-[9px] text-[12px] text-fg hover:bg-hover"
          >
            Verify findings
          </Link>
        ) : null}
      </span>
    </section>
  );
}
