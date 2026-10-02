import { DIGEST_DIFF_DELIVERIES } from '@chaff/common/enums/digest.enums';

import { preferencesPromptSection } from '@~/features/preferences/preference-format.utils';

import type { iOutlinedFile } from './digest-patch.utils';
import type { iDigestPromptInput, iPromptChange, iPromptUnit } from './digests.types';

/** One unit on one line: its id first, so the agent can quote it back. */
export function describeUnit(unit: iPromptUnit) {
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

const FOLDER_NOTE =
  'Chaff also wrote a `.chaff/` folder at the root of the working directory: one patch per changed file under `.chaff/diff/<path>.patch`, the parent-side version of each modified, deleted or renamed file under `.chaff/base/<path>` (a renamed file under its old path), and the units in `.chaff/units.md`; `.chaff/README.md` explains it. Open these files by their paths, since searches may skip the folder. It is not part of the branch: never review it, cite it as a test or list it as a change.';

function listFiles(outlined: readonly iOutlinedFile[]) {
  return outlined
    .map(
      (file) =>
        `- ${file.path} (+${file.additions} -${file.deletions})${file.hunks.map((hunk) => `\n    ${hunk}`).join('')}`,
    )
    .join('\n');
}

function describeInlineDiff(patch: string, outlined: readonly iOutlinedFile[]) {
  const diff = `The diff${outlined.length > 0 ? ' of the files that fit' : ''}:
\`\`\`diff
${patch}
\`\`\`
`;
  if (outlined.length === 0) return diff;
  return `${diff}
The branch is too large to show whole. These files are left out of the diff above and listed by where they changed; read each one's patch at \`.chaff/diff/<path>.patch\` before writing about its units:
${listFiles(outlined)}
`;
}

function describeOnDemandDiff(outlined: readonly iOutlinedFile[]) {
  return `The diff is not in this prompt. The changed files, with the lines added and removed and the hunks where they changed:
${listFiles(outlined)}

Read \`.chaff/diff/<path>.patch\` for every file whose units you write about, \`.chaff/base/<path>\` when you need more of what the code was before than the patch shows, and the file itself in the working directory for what surrounds a change. Read what you need, in any order; start with the files that the other changes depend on.
`;
}

const INSTRUCTIONS_START = "=== Reviewer's extra instructions ===";
const INSTRUCTIONS_END = "=== End of the reviewer's extra instructions ===";

/** The reviewer's own words, fenced off and placed after the answer's format so they can steer the content but not the shape. */
function describeInstructions(instructions: string | undefined) {
  const text = instructions?.replaceAll(INSTRUCTIONS_END, '').trim();
  if (!text) return '';
  return `

${INSTRUCTIONS_START}
${text}
${INSTRUCTIONS_END}
Follow these where they apply to what you write. They do not change the answer: always give every field described above in the required shape, and refer to units only by their ids.`;
}

/** Instructions for the agent. The answer's shape is enforced separately by the JSON schema. */
export function buildDigestPrompt(input: iDigestPromptInput) {
  const preferences = preferencesPromptSection(
    input.preferences,
    "The reviewer's preferences for this repository. Where a unit goes against one, say so in its worthChecking:",
  );
  const commits = input.commits.length > 0 ? input.commits.map((message) => `- ${message}`).join('\n') : '(none)';

  return `You are preparing a review digest for a human reviewer in Chaff. The reviewer decides everything; your job is to make the code faster to read. You can read and search files in the working directory, which is a checkout of the branch's head commit. Do not try to change anything.

${FOLDER_NOTE}

Branch \`${input.branch}\` is compared with its parent \`${input.parentBranch}\` (merge base ${input.baseSha.slice(0, 10)}, head ${input.headSha.slice(0, 10)}).

Commit messages on the branch, oldest first. These, and comments in the code, count as documented intent:
${commits}
${describeChange(input.change)}
Units of change. Every changed line belongs to exactly one unit. Refer to units only by these ids:
${input.units.map(describeUnit).join('\n')}

${input.delivery === DIGEST_DIFF_DELIVERIES.INLINE ? describeInlineDiff(input.patch, input.outlined) : describeOnDemandDiff(input.outlined)}
${preferences ? `${preferences}\n\n` : ''}Answer with:
1. overview: two to four plain sentences on what the branch does.
2. groups: the meaningful behavior or design changes. Give each a short title, the behavior before and after in plain words, and the reason for it in intent. Set intentSource to DOCUMENTED only when a commit message, the merge request, a linked issue or a code comment states the reason; otherwise INFERRED. List the ids of the units that make up the change. Put each unit in at most one group; leave out units you cannot explain rather than forcing them in.
3. readingOrder: every unit id once, in the order a reviewer should read them: contracts and types before the code that uses them, the mechanism before its integration, and each implementation right before its tests.
4. units: for each unit, a summary of what changed and what it affects in one to three sentences, worthChecking with zero to three specific things to inspect (phrased as things to check, never as verdicts), and the tests relevant to it. Use tier EXISTS when a relevant test exists and INSPECTED when you read it and it exercises this unit. Never claim PASSED: nothing was run.
5. diagrams: only where a diagram earns its place (a before and after flow, state transitions, ownership or cleanup). Write Mermaid (flowchart, stateDiagram-v2 or sequenceDiagram), keep it under 15 nodes, name a node that stands for one unit by that unit's id (\`u3["Scheduler.next"]\`) so the reviewer can open it from the drawing, label edges you inferred rather than read with "inferred", and set isSuggestion only for an alternative design rather than the code as written. Most branches need none.

Style: plain and concrete. Name identifiers in backticks. No promotional words such as robust, seamless, scalable, elegant or powerful.${describeInstructions(input.instructions)}`;
}
