import { em } from 'enumwaii';
import type { InferEnumwaii } from 'enumwaii';

import { DIGEST_RUNNER_LABELS, DIGEST_RUNNERS, digestRunnersEnumwaii } from '@chaff/common/enums/digest.enums';

/** Whitespace-only changes in diffs, as a choice. */
export const whitespaceChoicesEnumwaii = em(['SHOW', 'IGNORE']);

export const WHITESPACE_CHOICES = whitespaceChoicesEnumwaii.enum;
export type WhitespaceChoice = InferEnumwaii<typeof whitespaceChoicesEnumwaii>;
export const whitespaceChoiceValues = whitespaceChoicesEnumwaii.values;

export const WHITESPACE_CHOICE_LABELS = whitespaceChoicesEnumwaii.derive(
  [WHITESPACE_CHOICES.SHOW, 'Show'],
  [WHITESPACE_CHOICES.IGNORE, 'Ignore'],
);

/** When the Focus context panel opens, as a choice. */
export const contextPanelChoicesEnumwaii = em(['ON_DEMAND', 'PINNED']);

export const CONTEXT_PANEL_CHOICES = contextPanelChoicesEnumwaii.enum;
export type ContextPanelChoice = InferEnumwaii<typeof contextPanelChoicesEnumwaii>;
export const contextPanelChoiceValues = contextPanelChoicesEnumwaii.values;

export const CONTEXT_PANEL_CHOICE_LABELS = contextPanelChoicesEnumwaii.derive(
  [CONTEXT_PANEL_CHOICES.ON_DEMAND, 'When asked'],
  [CONTEXT_PANEL_CHOICES.PINNED, 'Always open'],
);

/** Setup shown for connecting coding agents: one per agent Chaff can add itself to, and any other MCP client. */
export const agentSetupTabsEnumwaii = digestRunnersEnumwaii.extend(['OTHER']);

export const AGENT_SETUP_TABS = agentSetupTabsEnumwaii.enum;
export type AgentSetupTab = InferEnumwaii<typeof agentSetupTabsEnumwaii>;
export const agentSetupTabValues = agentSetupTabsEnumwaii.values;

export const AGENT_SETUP_TAB_LABELS = agentSetupTabsEnumwaii.derive(
  [AGENT_SETUP_TABS.CLAUDE_CODE, DIGEST_RUNNER_LABELS.get(DIGEST_RUNNERS.CLAUDE_CODE)],
  [AGENT_SETUP_TABS.CODEX, DIGEST_RUNNER_LABELS.get(DIGEST_RUNNERS.CODEX)],
  [AGENT_SETUP_TABS.OTHER, 'Other'],
);
