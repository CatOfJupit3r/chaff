import path from 'node:path';

import { preferencesPromptSection } from '@~/features/preferences/preference-format.utils';

import { diffFileFor, FILE_DIFF_EXTENSION, WHOLE_DIFF_FILE } from './digest-diff-files.utils';
import type { iDigestPromptInput, iPromptChange, iPromptUnit } from './digests.types';

function describeUnit(unit: iPromptUnit) {
  const lines = [unit.oldLines && `old ${unit.oldLines}`, unit.newLines && `new ${unit.newLines}`]
    .filter(Boolean)
    .join(', ');
  return `${unit.shortId}  ${unit.kind} ${unit.title} | ${unit.path} | ${unit.change.toLowerCase()} ${lines} (+${unit.additions} -${unit.deletions})`;
}

function describeChange(change: iPromptChange | undefined) {
  if (!change) return '';
  const issues = change.issues.map(
    (issue) => `Issue #${issue.number}: ${issue.title}\n${issue.description.trim() || '(no description)'}`,
  );
  return `
The merge request's title and description on the host. They count as documented intent:
Title: ${change.title}
${change.description.trim() || '(no description)'}
${issues.length > 0 ? `\nIssues it links to, also documented intent:\n${issues.join('\n\n')}\n` : ''}`;
}

function describeDiff({ patch, outlined }: Pick<iDigestPromptInput, 'patch' | 'outlined'>) {
  if (!patch) return '';
  return `
The diff${outlined.length > 0 ? ' of the files that fit' : ''}:
\`\`\`diff
${patch}
\`\`\`
`;
}

function describeOutline({ outlined, diffDirectory }: Pick<iDigestPromptInput, 'outlined' | 'diffDirectory'>) {
  if (outlined.length === 0) return '';
  const files = outlined.map(
    (file) =>
      `- ${file.path} (+${file.additions} -${file.deletions}), diff in ${diffFileFor(diffDirectory, file.path)}${file.hunks.map((hunk) => `\n    ${hunk}`).join('')}`,
  );
  return `
The branch is too large to show whole, so these files are only listed, with where they changed. Before writing about their units, read the diffs you need from the files named here, and the code around them in the checkout:
${files.join('\n')}
`;
}

function describeInstructions(instructions: string | undefined) {
  if (!instructions) return '';
  return `The reviewer's extra instructions for this digest. Follow them as long as the answer keeps the shape asked for below:
${instructions}

`;
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

Commit messages on the branch, oldest first. These, and comments in the code, count as documented intent:
${commits}
${describeChange(input.change)}
Units of change. Every changed line belongs to exactly one unit. Refer to units only by these ids:
${input.units.map(describeUnit).join('\n')}

Every changed file's diff is saved as \`<path>${FILE_DIFF_EXTENSION}\` under ${input.diffDirectory}, and the whole branch's as ${path.join(input.diffDirectory, WHOLE_DIFF_FILE)}. Read or search them whenever you need to see exactly what changed.
${describeDiff(input)}${describeOutline(input)}
${preferences ? `${preferences}\n\n` : ''}${describeInstructions(input.instructions)}Answer with:
1. overview: two to four plain sentences on what the branch does.
2. groups: the meaningful behavior or design changes. Give each a short title, the behavior before and after in plain words, and the reason for it in intent. Set intentSource to DOCUMENTED only when a commit message, the merge request, a linked issue or a code comment states the reason; otherwise INFERRED. List the ids of the units that make up the change. Put each unit in at most one group; leave out units you cannot explain rather than forcing them in.
3. readingOrder: every unit id once, in the order a reviewer should read them: contracts and types before the code that uses them, the mechanism before its integration, and each implementation right before its tests.
4. units: for each unit, a summary of what changed and what it affects in one to three sentences, worthChecking with zero to three specific things to inspect (phrased as things to check, never as verdicts), and the tests relevant to it. Use tier EXISTS when a relevant test exists and INSPECTED when you read it and it exercises this unit. Never claim PASSED: nothing was run.
5. diagrams: only where a diagram earns its place (a before and after flow, state transitions, ownership or cleanup). Write Mermaid (flowchart, stateDiagram-v2 or sequenceDiagram), keep it under 15 nodes, name a node that stands for one unit by that unit's id (\`u3["Scheduler.next"]\`) so the reviewer can open it from the drawing, label edges you inferred rather than read with "inferred", and set isSuggestion only for an alternative design rather than the code as written. Most branches need none.

Style: plain and concrete. Name identifiers in backticks. No promotional words such as robust, seamless, scalable, elegant or powerful.`;
}
