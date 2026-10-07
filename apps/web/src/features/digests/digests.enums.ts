import {
  DIAGRAM_KINDS,
  diagramKindsEnumwaii,
  DIGEST_PARTS,
  digestPartsEnumwaii,
  INTENT_SOURCES,
  intentSourcesEnumwaii,
  TEST_TIERS,
  testTiersEnumwaii,
} from '@chaff/common/enums/digest.enums';

export const DIAGRAM_KIND_LABELS = diagramKindsEnumwaii.derive(
  [DIAGRAM_KINDS.FLOW, 'Flow'],
  [DIAGRAM_KINDS.STATE, 'States'],
  [DIAGRAM_KINDS.SEQUENCE, 'Sequence'],
  [DIAGRAM_KINDS.OWNERSHIP, 'Ownership'],
);

export const INTENT_SOURCE_LABELS = intentSourcesEnumwaii.derive(
  [INTENT_SOURCES.DOCUMENTED, 'from the commits or MR'],
  [INTENT_SOURCES.INFERRED, 'inferred'],
);

/** Whether the agent read the test; a digest never runs tests, so nothing reaches "passed". */
export const TEST_TIER_IS_READ = testTiersEnumwaii.derive(
  [TEST_TIERS.EXISTS, false],
  [TEST_TIERS.INSPECTED, true],
  [TEST_TIERS.PASSED, true],
);

/** What the reviewer might ask for when rewriting each part. */
export const DIGEST_PART_REVISE_PLACEHOLDERS = digestPartsEnumwaii.derive(
  [DIGEST_PARTS.OVERVIEW, 'For example: lead with what users will notice.'],
  [DIGEST_PARTS.UNIT_NOTE, 'For example: explain why the limit changed, and what calls this.'],
  [DIGEST_PARTS.DIAGRAM, 'For example: highlight the retry path, or split it into before and after.'],
);
