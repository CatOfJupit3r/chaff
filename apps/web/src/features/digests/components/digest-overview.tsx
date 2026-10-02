import { DIGEST_RUNNER_LABELS } from '@chaff/common/enums/digest.enums';
import type { DigestRunner } from '@chaff/common/enums/digest.enums';

import { SectionLabel } from '@~/components/ui/section-label';
import { cn } from '@~/lib/utils';
import { pluralize } from '@~/utils/pluralize';

import { INTENT_SOURCE_LABELS } from '../digests.enums';
import type { iDigestContent } from '../digests.types';
import { InlineCodeText } from './inline-code-text';

interface iDigestOverviewProps {
  runner: DigestRunner;
  content: iDigestContent;
  currentUnitId: string | undefined;
  onOpenUnit: (unitId: string) => void;
}

/** The digest's summary of the branch and the changes it is made of; a change opens at its first unit. */
export function DigestOverview({ runner, content, currentUnitId, onOpenUnit }: iDigestOverviewProps) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <SectionLabel>Digest · {DIGEST_RUNNER_LABELS(runner)}</SectionLabel>
        <p className="m-0 text-[12.5px] leading-[1.6] text-fg-soft">
          <InlineCodeText text={content.overview} />
        </p>
        <p className="m-0 text-[11.5px] text-faint">Cards follow the digest&apos;s reading order.</p>
      </section>
      <section className="flex flex-col gap-2">
        <SectionLabel>Changes</SectionLabel>
        {content.groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => group.unitIds[0] && onOpenUnit(group.unitIds[0])}
            className={cn(
              'flex flex-col gap-1 rounded-md border px-3 py-2 text-left text-[12.5px] hover:bg-hover',
              group.isUnexplained ? 'border-warn-line' : 'border-line',
              currentUnitId && group.unitIds.includes(currentUnitId) && 'bg-raised',
            )}
          >
            <span className="flex items-baseline gap-2">
              <span className={cn('font-medium', group.isUnexplained ? 'text-warn' : 'text-fg')}>{group.title}</span>
              <span className="ml-auto flex-none font-mono text-[11px] text-faint">
                {pluralize(group.unitIds.length, 'unit')}
              </span>
            </span>
            {group.before || group.after ? (
              <span className="text-muted">
                <InlineCodeText text={group.before} /> <span className="text-faint">→</span>{' '}
                <InlineCodeText text={group.after} />
              </span>
            ) : null}
            {group.intent ? (
              <span className="text-fg-soft">
                <InlineCodeText text={group.intent} />{' '}
                <span className="text-[11px] text-faint">({INTENT_SOURCE_LABELS(group.intentSource)})</span>
              </span>
            ) : null}
          </button>
        ))}
      </section>
    </>
  );
}
