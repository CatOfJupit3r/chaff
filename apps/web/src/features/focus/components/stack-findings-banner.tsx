import { FINDING_KIND_LABELS, FINDING_SCOPES } from '@chaff/common/enums/review.enums';

import { AlertIcon } from '@~/components/icons/icons';
import { Button } from '@~/components/ui/button';
import { SeverityPill } from '@~/features/findings/components/finding-badges';
import type { iFinding } from '@~/features/findings/findings.types';
import { findingTitle } from '@~/features/findings/findings.utils';
import { pluralize } from '@~/utils/pluralize';

interface iStackFindingsBannerProps {
  findings: readonly iFinding[];
  onShow: () => void;
}

function headline(findings: readonly iFinding[]) {
  const [only] = findings;
  if (findings.length > 1 || !only) {
    return `${pluralize(findings.length, 'finding')} from the rest of the stack affect this branch`;
  }
  const kind = FINDING_KIND_LABELS.get(only.kind);
  return only.scope === FINDING_SCOPES.STACK
    ? `${kind} on the whole stack, from ${only.branch}`
    : `${kind} on ${only.branch} affects this branch`;
}

/** Concerns on the branches below, and notes on the whole stack, that bear on the branch under review. */
export function StackFindingsBanner({ findings, onShow }: iStackFindingsBannerProps) {
  const [first] = findings;
  if (!first) return null;

  return (
    <section
      aria-label="From the rest of the stack"
      className="mb-4 flex w-full max-w-[920px] items-center gap-2.5 rounded-lg border border-warn-line bg-warn-soft px-4 py-2.5 text-[12.5px] text-muted"
    >
      <AlertIcon className="size-[15px] flex-none text-warn" />
      <span className="flex-none font-medium text-fg">{headline(findings)}</span>
      {findings.length === 1 ? (
        <>
          <SeverityPill finding={first} />
          <span className="min-w-0 truncate">
            F-{first.number} · {findingTitle(first)}
          </span>
        </>
      ) : null}
      <Button size="sm" className="ml-auto flex-none" onClick={onShow}>
        Show
      </Button>
    </section>
  );
}
