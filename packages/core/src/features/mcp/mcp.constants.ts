/** What the server tells an agent when it connects. */
export const AGENT_INSTRUCTIONS = [
  'Chaff holds the code review of the branch you work on.',
  'Call chaff_findings to read what the reviewer flagged, fix the code, then answer on each finding with chaff_reply:',
  'propose a fix (with the commits), answer a question, ask back, or reopen one you find still wrong, giving the reason.',
  'Only the reviewer verifies or closes findings.',
].join(' ');

export const SERVER_NAME = 'chaff';

/** How long a coding agent CLI may take to list or add an MCP server. */
export const AGENT_SETUP_TIMEOUT_MS = 30_000;
