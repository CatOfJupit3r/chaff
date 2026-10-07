/** The hand-off prompt: where the agent is and what it may do, then the export's agent prompt. */
export function buildFixPrompt(input: {
  branch: string;
  headSha: string;
  hasChaffTools: boolean;
  agentPrompt: string;
}) {
  return [
    `You are working in a checkout of \`${input.branch}\` at commit ${input.headSha.slice(0, 10)}, made for you by Chaff, a code review tool. Edit the files in this directory to address the findings below.`,
    '',
    '- Change only what the findings need. Do not reformat or refactor unrelated code.',
    '- Do not commit, push or switch branches. Chaff commits what you change to a branch of its own, and the reviewer decides what to keep.',
    ...(input.hasChaffTools
      ? [
          "- chaff_findings shows each finding's discussion, and chaff_reply lets you explain or ask the reviewer on a finding. Still list every finding you fixed in the report below; Chaff records the fixes from it.",
        ]
      : []),
    '',
    input.agentPrompt,
  ].join('\n');
}
