import { describe, expect, it } from 'vitest';

import { ANCHOR_MATCHES, DIFF_SIDES } from '@chaff/common/enums/review.enums';

import type { iFindingAnchor } from '@~/features/findings/findings.types';
import {
  isFindingOnUnit,
  linesTouchUnit,
  placeFindings,
  primaryNoteLabel,
} from '@~/features/reviews/finding-placements.utils';

import { findingFixture } from '../findings/finding-fixtures';
import { unitFixture } from './review-fixtures';

const UNIT = unitFixture('unit-1', undefined, {
  fileId: 'file-1',
  newStartLine: 10,
  newEndLine: 20,
  oldStartLine: 8,
  oldEndLine: 12,
});

function anchor(overrides: Partial<iFindingAnchor>): iFindingAnchor {
  return {
    id: crypto.randomUUID(),
    snapshotId: 's1',
    fileId: 'file-1',
    path: 'src/a.ts',
    side: DIFF_SIDES.NEW,
    startLine: 1,
    endLine: 1,
    quote: '',
    contextBefore: '',
    contextAfter: '',
    locations: [],
    ...overrides,
  };
}

describe('lines on a unit', () => {
  it('touches the unit when the picked lines overlap it on their side', () => {
    expect(linesTouchUnit({ fileId: 'file-1', side: DIFF_SIDES.NEW, startLine: 18, endLine: 25 }, UNIT)).toBe(true);
    expect(linesTouchUnit({ fileId: 'file-1', side: DIFF_SIDES.OLD, startLine: 12, endLine: 12 }, UNIT)).toBe(true);
  });

  it('does not touch it from the other side, past its ends, or in another file', () => {
    expect(linesTouchUnit({ fileId: 'file-1', side: DIFF_SIDES.OLD, startLine: 15, endLine: 16 }, UNIT)).toBe(false);
    expect(linesTouchUnit({ fileId: 'file-1', side: DIFF_SIDES.NEW, startLine: 21, endLine: 30 }, UNIT)).toBe(false);
    expect(linesTouchUnit({ fileId: 'file-2', side: DIFF_SIDES.NEW, startLine: 10, endLine: 10 }, UNIT)).toBe(false);
  });

  it('never touches a unit with no lines on that side', () => {
    const added = unitFixture('added', undefined, { fileId: 'file-1', newStartLine: 1, newEndLine: 5 });
    expect(linesTouchUnit({ fileId: 'file-1', side: DIFF_SIDES.OLD, startLine: 1, endLine: 5 }, added)).toBe(false);
  });
});

describe('findings on a unit', () => {
  it('counts a finding on the whole unit and one on lines inside it', () => {
    const onUnit = findingFixture({ anchors: [anchor({ unitId: 'unit-1', startLine: 10, endLine: 20 })] });
    const onLines = findingFixture({ anchors: [anchor({ startLine: 14, endLine: 15 })] });
    expect(isFindingOnUnit(onUnit, 's1', UNIT)).toBe(true);
    expect(isFindingOnUnit(onLines, 's1', UNIT)).toBe(true);
  });

  it('leaves out lines outside the unit, another unit, and anchors from other snapshots', () => {
    const outside = findingFixture({ anchors: [anchor({ startLine: 30, endLine: 31 })] });
    const otherUnit = findingFixture({ anchors: [anchor({ unitId: 'unit-2', startLine: 14, endLine: 15 })] });
    const elsewhere = findingFixture({ anchors: [anchor({ snapshotId: 's0', startLine: 14, endLine: 15 })] });
    expect(isFindingOnUnit(outside, 's1', UNIT)).toBe(false);
    expect(isFindingOnUnit(otherUnit, 's1', UNIT)).toBe(false);
    expect(isFindingOnUnit(elsewhere, 's1', UNIT)).toBe(false);
  });
});

describe('finding placements', () => {
  const onUnit = findingFixture({ anchors: [anchor({ unitId: 'unit-1', startLine: 10, endLine: 20 })] });
  const onLines = findingFixture({ anchors: [anchor({ startLine: 14, endLine: 15 })] });

  it('puts a unit finding on its first line and a line finding on its last', () => {
    const placements = placeFindings('s1', [onUnit, onLines]).get('file-1');
    expect(placements?.map(({ finding, line }) => [finding.id, line])).toEqual([
      [onUnit.id, 10],
      [onLines.id, 15],
    ]);
  });

  it('shows a finding on several units in full once, at its first anchor, and points there from the others', () => {
    const onChange = findingFixture({
      anchors: [
        anchor({ unitId: 'unit-1', path: 'src/a.ts', startLine: 10, endLine: 20 }),
        anchor({ unitId: 'unit-2', fileId: 'file-2', path: 'src/b.ts', startLine: 3, endLine: 9 }),
        anchor({ unitId: 'unit-3', fileId: 'file-2', path: 'src/b.ts', startLine: 30, endLine: 40 }),
      ],
    });
    const placements = placeFindings('s1', [onChange]);
    const shown = [...placements.values()].flat().map(({ line, isPrimary, primary }) => ({ line, isPrimary, primary }));
    const primary = { fileId: 'file-1', path: 'src/a.ts', line: 10 };
    expect(shown).toEqual([
      { line: 10, isPrimary: true, primary },
      { line: 3, isPrimary: false, primary },
      { line: 30, isPrimary: false, primary },
    ]);
  });

  it('puts the whole note on the first anchor found in the snapshot when the first one was lost', () => {
    const lost = anchor({
      snapshotId: 's0',
      unitId: 'unit-0',
      locations: [
        {
          id: 'l1',
          snapshotId: 's1',
          version: 2,
          headSha: 'sha',
          match: ANCHOR_MATCHES.UNMATCHED,
        },
      ],
    });
    const kept = anchor({
      snapshotId: 's0',
      path: 'src/b.ts',
      locations: [
        {
          id: 'l2',
          snapshotId: 's1',
          version: 2,
          headSha: 'sha',
          match: ANCHOR_MATCHES.EXACT,
          fileId: 'file-2',
          startLine: 4,
          endLine: 6,
        },
      ],
    });
    const placements = placeFindings('s1', [findingFixture({ anchors: [lost, kept] })]);
    expect(placements.get('file-2')?.map(({ isPrimary, primary }) => [isPrimary, primary])).toEqual([
      [true, { fileId: 'file-2', path: 'src/b.ts', line: 6 }],
    ]);
  });

  it('points to the note by line in its own file, and by file name and line from another file', () => {
    const primary = { fileId: 'file-1', path: 'apps/web/src/a.ts', line: 58 };
    expect(primaryNoteLabel(primary, 'file-1')).toBe('line 58');
    expect(primaryNoteLabel(primary, 'file-2')).toBe('a.ts:58');
  });

  it('can leave findings on whole units out', () => {
    const placements = placeFindings('s1', [onUnit, onLines], false).get('file-1');
    expect(placements?.map(({ finding }) => finding.id)).toEqual([onLines.id]);
  });
});
