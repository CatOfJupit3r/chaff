import { preferencesPromptSection } from '@~/features/preferences/preference-format.utils';

import type { iDigestPromptInput, iPromptUnit } from './digests.types';

function describeUnit(unit: iPromptUnit) {
  const lines = [unit.oldLines && `old ${unit.oldLines}`, unit.newLines && `new ${unit.newLines}`]
    .filter(Boolean)
    .join(', ');
  return `${unit.shortId}  ${unit.kind} ${unit.title} | ${unit.path} | ${unit.change.toLowerCase()} ${lines} (+${unit.additions} -${unit.deletions})`;
}

/** Instructions for the agent. The answer's shape is enforced separately by the JSON schema. */
export function buildDigestPrompt(input: iDigestPromptInput) {
  const preferences = preferencesPromptSection(
    input.preferences,
    "The reviewer's preferences for this repository. Where a unit goes against one, say so in its worthChecking:",
  );
  const commits = input.commits.length > 0 ? input.commits.map((message) => `- ${message}`).join('\n') : '(none)';

  return `You are preparing a review digest for a human reviewer in Chaff. The reviewer decides everything; your job is to make the code faster to read. You can read and search files in the working directory, which is a checkout of the branch's head commit. Do not try to change anything.

Branch \`${input.branch}\` is compared with its parent \`${input.parentBranch}\` (merge base ${input.baseSha.slice(0, 10)}, head ${input.headSha.slice(0, 10)}).

Commit messages on the branch, oldest first. Only these, and comments in the code, count as documented intent:
${commits}

Units of change. Every changed line belongs to exactly one unit. Refer to units only by these ids:
${input.units.map(describeUnit).join('\n')}

The diff${input.isPatchTruncated ? ' (cut short; read the files for the rest)' : ''}:
\`\`\`diff
${input.patch}
\`\`\`

${preferences ? `${preferences}\n\n` : ''}Answer with:
1. overview: two to four plain sentences on what the branch does.
2. groups: the meaningful behavior or design changes. Give each a short title, the behavior before and after in plain words, and the reason for it in intent. Set intentSource to DOCUMENTED only when a commit message or a code comment states the reason; otherwise INFERRED. List the ids of the units that make up the change. Put each unit in at most one group; leave out units you cannot explain rather than forcing them in.
3. readingOrder: every unit id once, in the order a reviewer should read them: contracts and types before the code that uses them, the mechanism before its integration, and each implementation right before its tests.
4. units: for each unit, a summary of what changed and what it affects in one to three sentences, worthChecking with zero to three specific things to inspect (phrased as things to check, never as verdicts), and the tests relevant to it. Use tier EXISTS when a relevant test exists and INSPECTED when you read it and it exercises this unit. Never claim PASSED: nothing was run.
5. diagrams: only where a diagram earns its place (a before and after flow, state transitions, ownership or cleanup). Write Mermaid (flowchart, stateDiagram-v2 or sequenceDiagram), keep it under 15 nodes, label edges you inferred rather than read with "inferred", and set isSuggestion only for an alternative design rather than the code as written. Most branches need none.

Style: plain and concrete. Name identifiers in backticks. No promotional words such as robust, seamless, scalable, elegant or powerful.`;
}
