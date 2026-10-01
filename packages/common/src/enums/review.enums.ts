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
