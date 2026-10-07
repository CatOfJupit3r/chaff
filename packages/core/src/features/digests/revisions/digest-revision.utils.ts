import { DIGEST_PARTS, DIGEST_STATUSES } from '@chaff/common/enums/digest.enums';

import type { iDigestContent } from '@~/features/digests/digests.types';

import type { iDigestPartRef, iDigestRevisionRecord, iRevisedPart } from './digest-revisions.types';

export function isSamePart(first: iDigestPartRef, second: iDigestPartRef) {
  return first.part === second.part && first.partId === second.partId;
}

/** The overview, a unit's note or a diagram as `content` has it; undefined when it has no such part. */
export function findPart(content: iDigestContent, { part, partId }: iDigestPartRef): iRevisedPart | undefined {
  if (part === DIGEST_PARTS.OVERVIEW) {
    return partId === undefined ? { part: DIGEST_PARTS.OVERVIEW, overview: content.overview } : undefined;
  }
  if (part === DIGEST_PARTS.UNIT_NOTE) {
    const note = content.units.find((candidate) => candidate.unitId === partId);
    return note ? { part: DIGEST_PARTS.UNIT_NOTE, note } : undefined;
  }
  const diagram = content.diagrams.find((candidate) => candidate.id === partId);
  return diagram ? { part: DIGEST_PARTS.DIAGRAM, diagram } : undefined;
}

/** The digest with each part's selected version in place of its own. */
export function applyRevisions(content: iDigestContent, revisions: readonly iDigestRevisionRecord[]) {
  return revisions.reduce<iDigestContent>((applied, revision) => {
    const revised = revision.content;
    if (!revision.isSelected || revision.status !== DIGEST_STATUSES.READY || !revised) return applied;
    if ('overview' in revised) return { ...applied, overview: revised.overview };
    if ('note' in revised) {
      return {
        ...applied,
        units: applied.units.map((note) => (note.unitId === revised.note.unitId ? revised.note : note)),
      };
    }
    return {
      ...applied,
      diagrams: applied.diagrams.map((diagram) => (diagram.id === revised.diagram.id ? revised.diagram : diagram)),
    };
  }, content);
}
