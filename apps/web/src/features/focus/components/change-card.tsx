import { ChangeDigestNote } from '@~/features/digests/components/change-digest-note';
import { UnitDiagramView } from '@~/features/digests/components/unit-diagram-view';
import type { iDigest } from '@~/features/digests/digests.types';
import { readyContent } from '@~/features/digests/digests.utils';
import type { iFinding } from '@~/features/findings/findings.types';
import type { iSnapshot } from '@~/features/reviews/reviews.types';

import type { iFocusCard } from '../focus-cards.utils';
import { CARD_VIEWS } from '../focus.enums';
import type { CardExit, CardView } from '../focus.enums';
import { useFoundTests } from '../hooks/use-found-tests';
import { CardFindings } from './card-findings';
import { CardTestsView } from './card-tests-view';
import { ChangeCardTop } from './change-card-top';
import { ChangeMarkNote } from './change-mark-note';
import { ChangeMemberCode, ChangeMemberUsages } from './change-member-code';
import { FocusCardShell } from './focus-card-shell';
import { UnitViewTabs } from './unit-view-tabs';

interface iChangeCardProps {
  snapshot: iSnapshot;
  card: iFocusCard;
  findings: readonly iFinding[];
  digest: iDigest | undefined;
  view: CardView;
  exit?: CardExit;
  onViewChange: (view: CardView) => void;
  onOpenInEditor: (path: string, line?: number) => void;
  onOpenUnit: (unitId: string) => void;
  onEdit: () => void;
  onSwipe?: (exit: CardExit) => unknown;
}

/** A Change unit: the behavior it changes, then each of its units, decided on together. */
export function ChangeCard({
  snapshot,
  card,
  findings,
  digest,
  view,
  exit,
  onViewChange,
  onOpenInEditor,
  onOpenUnit,
  onEdit,
  onSwipe,
}: iChangeCardProps) {
  const content = readyContent(digest);
  const group = content?.groups.find((candidate) => candidate.id === card.change?.digestGroupId);
  const unitIds = new Set(card.units.map((unit) => unit.id));
  const diagrams = content?.diagrams.filter((diagram) => diagram.unitIds.some((unitId) => unitIds.has(unitId))) ?? [];
  const allTests = content?.units.filter((note) => unitIds.has(note.unitId)).flatMap((note) => note.tests) ?? [];
  const tests = [...new Map(allTests.map((test) => [`${test.path}:${test.line ?? ''}`, test])).values()];
  const found = useFoundTests(
    snapshot.id,
    card.units.map((unit) => unit.id),
  );
  const testCount = tests.length > 0 ? tests.length : found.length;
  const counts = new Map<CardView, number>([[CARD_VIEWS.code, card.units.length]]);
  if (content) counts.set(CARD_VIEWS.diagram, diagrams.length);
  if (content || testCount > 0) counts.set(CARD_VIEWS.tests, testCount);
  const fileOf = (fileId: string) => snapshot.files.find((file) => file.id === fileId);

  return (
    <FocusCardShell label={card.title} exit={exit} onSwipe={onSwipe}>
      <ChangeCardTop card={card} files={snapshot.files} onEdit={onEdit} />
      {digest && group ? <ChangeDigestNote runner={digest.runner} group={group} /> : null}
      <ChangeMarkNote card={card} headSha={snapshot.headSha} hasFindings={findings.length > 0} />
      <CardFindings findings={findings} />
      <UnitViewTabs view={view} counts={counts} onChange={onViewChange} />
      {view === CARD_VIEWS.code
        ? card.units.map((unit) => (
            <ChangeMemberCode
              key={unit.id}
              snapshotId={snapshot.id}
              unit={unit}
              file={fileOf(unit.fileId)}
              onOpenInEditor={onOpenInEditor}
            />
          ))
        : null}
      {view === CARD_VIEWS.usages
        ? card.units.map((unit) => (
            <ChangeMemberUsages key={unit.id} snapshotId={snapshot.id} unit={unit} onOpenInEditor={onOpenInEditor} />
          ))
        : null}
      {view === CARD_VIEWS.diagram ? (
        <div className="border-t border-line">
          <UnitDiagramView
            snapshotId={snapshot.id}
            diagrams={diagrams}
            hasDigest={content !== undefined}
            currentUnitIds={unitIds}
            onOpenUnit={onOpenUnit}
          />
        </div>
      ) : null}
      {view === CARD_VIEWS.tests ? (
        <CardTestsView
          tests={tests}
          found={found}
          headSha={snapshot.headSha}
          hasDigest={content !== undefined}
          onOpenInEditor={onOpenInEditor}
        />
      ) : null}
    </FocusCardShell>
  );
}
