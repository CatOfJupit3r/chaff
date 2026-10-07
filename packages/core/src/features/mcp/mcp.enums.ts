import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

/** The tools the Chaff MCP server offers; lowercase because agents call them by these names. */
export const chaffToolsEnumwaii = em(['chaff_findings', 'chaff_reply']);

export const CHAFF_TOOLS = chaffToolsEnumwaii.enum;
export type ChaffTool = InferEnumwaii<typeof chaffToolsEnumwaii>;
