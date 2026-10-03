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

/**
 * The reviewer's decision on a unit in one snapshot. Skipped says the reviewer chose not to read it, with a
 * reason; it is not approval.
 */
export const unitMarksEnumwaii = new Enumwaii('UnitMark', ['LOOKS_GOOD', 'CONCERN', 'QUESTION', 'LATER', 'SKIPPED']);

export const UNIT_MARKS = unitMarksEnumwaii.enum;
export type UnitMark = InferEnumwaii<typeof unitMarksEnumwaii>;
export const unitMarkSchema = unitMarksEnumwaii.schema;
export const unitMarkValues = unitMarksEnumwaii.values;

/** The reviewer read the unit and decided on it. */
export const IS_INSPECTED_MARK = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: true,
  [UNIT_MARKS.CONCERN]: true,
  [UNIT_MARKS.QUESTION]: true,
  [UNIT_MARKS.LATER]: false,
  [UNIT_MARKS.SKIPPED]: false,
});

/** The unit's regions count towards a complete review: decided on, or skipped on purpose. */
export const IS_ACCOUNTED_MARK = unitMarksEnumwaii.derive({
  [UNIT_MARKS.LOOKS_GOOD]: true,
  [UNIT_MARKS.CONCERN]: true,
  [UNIT_MARKS.QUESTION]: true,
  [UNIT_MARKS.LATER]: false,
  [UNIT_MARKS.SKIPPED]: true,
});

export const findingKindsEnumwaii = new Enumwaii('FindingKind', ['CONCERN', 'QUESTION', 'NOTE']);

export const FINDING_KINDS = findingKindsEnumwaii.enum;
export type FindingKind = InferEnumwaii<typeof findingKindsEnumwaii>;
export const findingKindSchema = findingKindsEnumwaii.schema;

/** How much a concern matters; optional, and only concerns carry one. */
export const findingSeveritiesEnumwaii = new Enumwaii('FindingSeverity', ['MINOR', 'MAJOR', 'BLOCKING']);

export const FINDING_SEVERITIES = findingSeveritiesEnumwaii.enum;
export type FindingSeverity = InferEnumwaii<typeof findingSeveritiesEnumwaii>;
export const findingSeveritySchema = findingSeveritiesEnumwaii.schema;
export const findingSeverityValues = findingSeveritiesEnumwaii.values;

export const FINDING_SEVERITY_LABELS = findingSeveritiesEnumwaii.derive({
  [FINDING_SEVERITIES.MINOR]: 'Minor',
  [FINDING_SEVERITIES.MAJOR]: 'Major',
  [FINDING_SEVERITIES.BLOCKING]: 'Blocking',
});

/**
 * What a finding is about: code it is anchored to, the whole branch, or the whole stack the branch is in
 * (architectural feedback such as "these three branches solve the same problem three ways").
 */
export const findingScopesEnumwaii = new Enumwaii('FindingScope', ['CODE', 'BRANCH', 'STACK']);

export const FINDING_SCOPES = findingScopesEnumwaii.enum;
export type FindingScope = InferEnumwaii<typeof findingScopesEnumwaii>;
export const findingScopeSchema = findingScopesEnumwaii.schema;

export const FINDING_SCOPE_LABELS = findingScopesEnumwaii.derive({
  [FINDING_SCOPES.CODE]: 'Code',
  [FINDING_SCOPES.BRANCH]: 'Whole branch',
  [FINDING_SCOPES.STACK]: 'Whole stack',
});

/**
 * A finding's suggested task: a coding agent is writing it, it waits for the reviewer, the reviewer
 * accepted it (as written or edited), or writing it failed. Discarding removes it.
 */
export const findingTaskStatesEnumwaii = new Enumwaii('FindingTaskState', [
  'WRITING',
  'PROPOSED',
  'ACCEPTED',
  'FAILED',
]);

export const FINDING_TASK_STATES = findingTaskStatesEnumwaii.enum;
export type FindingTaskState = InferEnumwaii<typeof findingTaskStatesEnumwaii>;
export const findingTaskStateSchema = findingTaskStatesEnumwaii.schema;

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
export const findingStatusValues = findingStatusesEnumwaii.values;

export const FINDING_KIND_LABELS = findingKindsEnumwaii.derive({
  [FINDING_KINDS.CONCERN]: 'Concern',
  [FINDING_KINDS.QUESTION]: 'Question',
  [FINDING_KINDS.NOTE]: 'Note',
});

export const FINDING_STATUS_LABELS = findingStatusesEnumwaii.derive({
  [FINDING_STATUSES.OPEN]: 'Open',
  [FINDING_STATUSES.FIX_PROPOSED]: 'Fix proposed',
  [FINDING_STATUSES.VERIFIED]: 'Verified',
  [FINDING_STATUSES.REOPENED]: 'Reopened',
  [FINDING_STATUSES.ANSWERED]: 'Answered',
  [FINDING_STATUSES.CLOSED]: 'Closed',
  [FINDING_STATUSES.WITHDRAWN]: 'Withdrawn',
  [FINDING_STATUSES.UNMATCHED]: 'Outdated',
});

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

/** Who moved a finding: the reviewer by hand, Chaff after a new snapshot, or a coding agent's report. */
export const findingEventSourcesEnumwaii = new Enumwaii('FindingEventSource', ['REVIEWER', 'CHAFF', 'AGENT']);

export const FINDING_EVENT_SOURCES = findingEventSourcesEnumwaii.enum;
export type FindingEventSource = InferEnumwaii<typeof findingEventSourcesEnumwaii>;
export const findingEventSourceSchema = findingEventSourcesEnumwaii.schema;

/**
 * How a unit compares with the same unit in the previous snapshot of its review. Possibly affected units
 * did not change but use a declaration that did; their marks are kept and they are flagged for a recheck.
 */
export const unitRevisionsEnumwaii = new Enumwaii('UnitRevision', ['UNCHANGED', 'EDITED', 'NEW', 'POSSIBLY_AFFECTED']);

export const UNIT_REVISIONS = unitRevisionsEnumwaii.enum;
export type UnitRevision = InferEnumwaii<typeof unitRevisionsEnumwaii>;
export const unitRevisionSchema = unitRevisionsEnumwaii.schema;

/** How a finding's anchor was found again in a newer snapshot: the same code, changed code between the same context, or not at all. */
export const anchorMatchesEnumwaii = new Enumwaii('AnchorMatch', ['EXACT', 'CHANGED', 'UNMATCHED']);

export const ANCHOR_MATCHES = anchorMatchesEnumwaii.enum;
export type AnchorMatch = InferEnumwaii<typeof anchorMatchesEnumwaii>;
export const anchorMatchSchema = anchorMatchesEnumwaii.schema;

export const diffSidesEnumwaii = new Enumwaii('DiffSide', ['OLD', 'NEW']);

export const DIFF_SIDES = diffSidesEnumwaii.enum;
export type DiffSide = InferEnumwaii<typeof diffSidesEnumwaii>;
export const diffSideSchema = diffSidesEnumwaii.schema;

/**
 * What a review compares: a branch against its parent, the uncommitted work on top of a checked-out
 * branch, a branch against the bottom of its stack (everything the stack adds), or a GitLab merge
 * request or GitHub pull request against its target branch.
 */
export const reviewTargetKindsEnumwaii = new Enumwaii('ReviewTargetKind', [
  'BRANCH',
  'WORKING_CHANGES',
  'CUMULATIVE',
  'CHANGE_REQUEST',
]);

export const REVIEW_TARGET_KINDS = reviewTargetKindsEnumwaii.enum;
export type ReviewTargetKind = InferEnumwaii<typeof reviewTargetKindsEnumwaii>;
export const reviewTargetKindSchema = reviewTargetKindsEnumwaii.schema;

/** Where a Change unit came from: a group the AI digest proposed, or one the reviewer made. */
export const changeUnitSourcesEnumwaii = new Enumwaii('ChangeUnitSource', ['DIGEST', 'REVIEWER']);

export const CHANGE_UNIT_SOURCES = changeUnitSourcesEnumwaii.enum;
export type ChangeUnitSource = InferEnumwaii<typeof changeUnitSourcesEnumwaii>;
export const changeUnitSourceSchema = changeUnitSourcesEnumwaii.schema;

/**
 * The order Focus walks a review in: Change units with the units no change covers after them, every Function
 * unit, or every Section unit. Lowercase because it appears in the URL.
 */
export const reviewProgressionsEnumwaii = new Enumwaii('ReviewProgression', ['changes', 'functions', 'sections']);

export const REVIEW_PROGRESSIONS = reviewProgressionsEnumwaii.enum;
export type ReviewProgression = InferEnumwaii<typeof reviewProgressionsEnumwaii>;
export const reviewProgressionSchema = reviewProgressionsEnumwaii.schema;
export const reviewProgressionValues = reviewProgressionsEnumwaii.values;
