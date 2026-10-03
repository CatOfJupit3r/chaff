import { Enumwaii } from '@chaff/enumwaii/enumwaii';
import type { InferEnumwaii } from '@chaff/enumwaii/enumwaii';

/** Which findings an export covers: one review, every review in its stack, or the whole repository. */
export const exportScopesEnumwaii = new Enumwaii('ExportScope', ['review', 'stack', 'repository']);

export const EXPORT_SCOPES = exportScopesEnumwaii.enum;
export type ExportScope = InferEnumwaii<typeof exportScopesEnumwaii>;
export const exportScopeSchema = exportScopesEnumwaii.schema;
export const exportScopeValues = exportScopesEnumwaii.values;

/** Statuses a coding agent may report for a finding. Lowercase because agents write them in JSON. */
export const agentReportStatusesEnumwaii = new Enumwaii('AgentReportStatus', ['fix_proposed', 'answered']);

export const AGENT_REPORT_STATUSES = agentReportStatusesEnumwaii.enum;
export type AgentReportStatus = InferEnumwaii<typeof agentReportStatusesEnumwaii>;
export const agentReportStatusValues = agentReportStatusesEnumwaii.values;

/** Why a reported finding was left as it was. */
export const reportSkipReasonsEnumwaii = new Enumwaii('ReportSkipReason', [
  'UNSUPPORTED_STATUS',
  'WRONG_KIND',
  'NOT_ACTIVE',
  'ALREADY_SET',
  'MISSING_NOTE',
]);

export const REPORT_SKIP_REASONS = reportSkipReasonsEnumwaii.enum;
export type ReportSkipReason = InferEnumwaii<typeof reportSkipReasonsEnumwaii>;
export const reportSkipReasonSchema = reportSkipReasonsEnumwaii.schema;
