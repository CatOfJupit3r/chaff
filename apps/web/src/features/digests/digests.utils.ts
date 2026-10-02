import { DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import type { iDigest, iDigestContent } from './digests.types';

/** The digest's content once it is ready; a running, failed or stopped digest has none to show. */
export function readyContent(digest: iDigest | null | undefined): iDigestContent | undefined {
  return digest?.status === DIGEST_STATUSES.READY ? digest.content : undefined;
}

/** Units in the digest's reading order; units it does not mention keep their order at the end. */
export function orderByReading<TUnit extends { id: string }>(
  units: readonly TUnit[],
  readingOrder?: readonly string[],
) {
  if (!readingOrder || readingOrder.length === 0) return units;
  const rank = new Map(readingOrder.map((id, index) => [id, index]));
  return units
    .map((unit, index) => ({ unit, rank: rank.get(unit.id) ?? readingOrder.length + index }))
    .toSorted((first, second) => first.rank - second.rank)
    .map(({ unit }) => unit);
}

export function findUnitNote(content: iDigestContent | undefined, unitId: string) {
  return content?.units.find((note) => note.unitId === unitId);
}

export function findUnitDiagrams(content: iDigestContent | undefined, unitId: string) {
  return content?.diagrams.filter((diagram) => diagram.unitIds.includes(unitId)) ?? [];
}

export function findUnitGroup(content: iDigestContent | undefined, unitId: string) {
  return content?.groups.find((group) => group.unitIds.includes(unitId));
}

/** Splits text on backticks so `identifiers` can be shown as code. Odd parts are code. */
export function splitInlineCode(text: string) {
  return text.split('`');
}
