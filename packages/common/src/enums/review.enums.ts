import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

export const fileStatusesEnumwaii = new Enumwaii('FileStatus', [
  'ADDED',
  'MODIFIED',
  'DELETED',
  'RENAMED',
  'TYPE_CHANGED',
]);

export const FILE_STATUSES = fileStatusesEnumwaii.enum;
export type FileStatus = InferEnumwaii<typeof fileStatusesEnumwaii>;
export const fileStatusSchema = fileStatusesEnumwaii.schema;

export const FILE_STATUS_LABELS = fileStatusesEnumwaii.derive({
  [FILE_STATUSES.ADDED]: 'Added',
  [FILE_STATUSES.MODIFIED]: 'Modified',
  [FILE_STATUSES.DELETED]: 'Deleted',
  [FILE_STATUSES.RENAMED]: 'Renamed',
  [FILE_STATUSES.TYPE_CHANGED]: 'Type changed',
});

/** What a changed file is, which decides how it is split into units and whether it starts collapsed. */
export const fileKindsEnumwaii = new Enumwaii('FileKind', ['SOURCE', 'TEST', 'CONFIG', 'DOCS', 'GENERATED', 'BINARY']);

export const FILE_KINDS = fileKindsEnumwaii.enum;
export type FileKind = InferEnumwaii<typeof fileKindsEnumwaii>;
export const fileKindSchema = fileKindsEnumwaii.schema;

/** Function units cover one declaration; section units cover changes outside declarations or whole files. */
export const unitKindsEnumwaii = new Enumwaii('UnitKind', ['FUNCTION', 'SECTION']);

export const UNIT_KINDS = unitKindsEnumwaii.enum;
export type UnitKind = InferEnumwaii<typeof unitKindsEnumwaii>;
export const unitKindSchema = unitKindsEnumwaii.schema;

export const symbolKindsEnumwaii = new Enumwaii('SymbolKind', [
  'FUNCTION',
  'METHOD',
  'CLASS',
  'INTERFACE',
  'TYPE',
  'ENUM',
  'STRUCT',
  'TRAIT',
  'IMPL',
  'MODULE',
  'VARIABLE',
  'TEST',
]);

export const SYMBOL_KINDS = symbolKindsEnumwaii.enum;
export type SymbolKind = InferEnumwaii<typeof symbolKindsEnumwaii>;
export const symbolKindSchema = symbolKindsEnumwaii.schema;

export const unitChangesEnumwaii = new Enumwaii('UnitChange', ['ADDED', 'REMOVED', 'MODIFIED']);

export const UNIT_CHANGES = unitChangesEnumwaii.enum;
export type UnitChange = InferEnumwaii<typeof unitChangesEnumwaii>;
export const unitChangeSchema = unitChangesEnumwaii.schema;

/** The reviewer's decision on a unit in one snapshot. Every mark but Later counts as inspected. */
export const unitMarksEnumwaii = new Enumwaii('UnitMark', ['LOOKS_GOOD', 'CONCERN', 'QUESTION', 'LATER']);

export const UNIT_MARKS = unitMarksEnumwaii.enum;
export type UnitMark = InferEnumwaii<typeof unitMarksEnumwaii>;
export const unitMarkSchema = unitMarksEnumwaii.schema;

export const IS_INSPECTED_MARK = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: true,
  [UNIT_MARKS.CONCERN]: true,
  [UNIT_MARKS.QUESTION]: true,
  [UNIT_MARKS.LATER]: false,
});

export const findingKindsEnumwaii = new Enumwaii('FindingKind', ['CONCERN', 'QUESTION', 'NOTE']);

export const FINDING_KINDS = findingKindsEnumwaii.enum;
export type FindingKind = InferEnumwaii<typeof findingKindsEnumwaii>;
export const findingKindSchema = findingKindsEnumwaii.schema;

/**
 * Concerns go Open, Fix proposed, Verified (or Reopened); questions go Open, Answered, Closed.
 * Withdrawn is the reviewer changing their mind; Unmatched means the anchor was lost in a newer snapshot.
 */
export const findingStatusesEnumwaii = new Enumwaii('FindingStatus', [
  'OPEN',
  'FIX_PROPOSED',
  'VERIFIED',
  'REOPENED',
  'ANSWERED',
  'CLOSED',
  'WITHDRAWN',
  'UNMATCHED',
]);

export const FINDING_STATUSES = findingStatusesEnumwaii.enum;
export type FindingStatus = InferEnumwaii<typeof findingStatusesEnumwaii>;
export const findingStatusSchema = findingStatusesEnumwaii.schema;

export const IS_ACTIVE_FINDING_STATUS = findingStatusesEnumwaii.derive({
  [FINDING_STATUSES.OPEN]: true,
  [FINDING_STATUSES.FIX_PROPOSED]: true,
  [FINDING_STATUSES.VERIFIED]: false,
  [FINDING_STATUSES.REOPENED]: true,
  [FINDING_STATUSES.ANSWERED]: true,
  [FINDING_STATUSES.CLOSED]: false,
  [FINDING_STATUSES.WITHDRAWN]: false,
  [FINDING_STATUSES.UNMATCHED]: true,
});

export const diffSidesEnumwaii = new Enumwaii('DiffSide', ['OLD', 'NEW']);

export const DIFF_SIDES = diffSidesEnumwaii.enum;
export type DiffSide = InferEnumwaii<typeof diffSidesEnumwaii>;
export const diffSideSchema = diffSidesEnumwaii.schema;
