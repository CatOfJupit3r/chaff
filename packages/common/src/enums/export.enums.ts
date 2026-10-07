import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

/** Which findings an export covers: one review, every review in its stack, or the whole repository. */
export const exportScopesEnumwaii = em(['review', 'stack', 'repository']);

export const EXPORT_SCOPES = exportScopesEnumwaii.enum;
export type ExportScope = InferEnumwaii<typeof exportScopesEnumwaii>;
export const exportScopeSchema = emToZodSchema(exportScopesEnumwaii);
export const exportScopeValues = exportScopesEnumwaii.values;

/** Statuses a coding agent may report for a finding. Lowercase because agents write them in JSON. */
export const agentReportStatusesEnumwaii = em(['fix_proposed', 'answered', 'reopened']);

export const AGENT_REPORT_STATUSES = agentReportStatusesEnumwaii.enum;
export type AgentReportStatus = InferEnumwaii<typeof agentReportStatusesEnumwaii>;
export const agentReportStatusValues = agentReportStatusesEnumwaii.values;

/** Why a reported finding was left as it was. */
export const reportSkipReasonsEnumwaii = em([
  'UNSUPPORTED_STATUS',
  'WRONG_KIND',
  'NOT_ALLOWED',
  'ALREADY_SET',
  'MISSING_NOTE',
]);

export const REPORT_SKIP_REASONS = reportSkipReasonsEnumwaii.enum;
export type ReportSkipReason = InferEnumwaii<typeof reportSkipReasonsEnumwaii>;
export const reportSkipReasonSchema = emToZodSchema(reportSkipReasonsEnumwaii);
