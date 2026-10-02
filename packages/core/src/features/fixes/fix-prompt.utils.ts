/** The hand-off prompt: where the agent is and what it may do, then the export's agent prompt. */
export function buildFixPrompt(input: { branch: string; headSha: string; agentPrompt: string }) {
  return [
    `You are working in a checkout of \`${input.branch}\` at commit ${input.headSha.slice(0, 10)}, made for you by Chaff, a code review tool. Edit the files in this directory to address the findings below.`,
    '',
    '- Change only what the findings need. Do not reformat or refactor unrelated code.',
    '- Do not commit, push or switch branches. Chaff commits what you change to a branch of its own, and the reviewer decides what to keep.',
    '',
    input.agentPrompt,
  ].join('\n');
}
