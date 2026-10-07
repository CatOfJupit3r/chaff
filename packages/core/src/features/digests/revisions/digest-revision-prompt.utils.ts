import {
  DIAGRAM_RULES,
  OVERVIEW_RULES,
  STYLE_RULES,
  UNIT_NOTE_RULES,
} from '@~/features/digests/digest-prompt.constants';
import { describeDiffFiles, describeUnit } from '@~/features/digests/digest-prompt.utils';
import type { iPromptUnit } from '@~/features/digests/digests.types';

import { DIGEST_PART_PROMPT_NAMES } from './digest-revision.constants';
import type { iRevisedPart, iRevisionPromptInput } from './digest-revisions.types';

/** The part as the reviewer sees it now, with units named by their short ids. */
function describeCurrent(current: iRevisedPart, units: readonly iPromptUnit[]) {
  const shortIdOf = (unitId: string) => units.find((unit) => unit.unitId === unitId)?.shortId ?? unitId;
  if ('overview' in current) return current.overview;
  if ('note' in current) {
    const { note } = current;
    const checks = note.worthChecking.map((item) => `- ${item}`).join('\n') || '(none)';
    const tests =
      note.tests
        .map((test) => `- ${test.path}${test.line ? `:${test.line}` : ''} (${test.tier}) ${test.note}`)
        .join('\n') || '(none)';
    return `Unit ${shortIdOf(note.unitId)}.
summary: ${note.summary}
worthChecking:
${checks}
tests:
${tests}`;
  }
  const { diagram } = current;
  return `title: ${diagram.title}
kind: ${diagram.kind}
isSuggestion: ${diagram.isSuggestion}
units: ${diagram.unitIds.map(shortIdOf).join(', ') || '(none)'}
\`\`\`mermaid
${diagram.mermaid}
\`\`\``;
}

function describeAnswer(current: iRevisedPart, units: readonly iPromptUnit[]) {
  if ('overview' in current) return `overview: ${OVERVIEW_RULES}`;
  if ('note' in current) {
    const shortId = units.find((unit) => unit.unitId === current.note.unitId)?.shortId ?? '';
    return `The note on unit ${shortId}: ${UNIT_NOTE_RULES}`;
  }
  return `The diagram: title, kind (FLOW, STATE, SEQUENCE or OWNERSHIP), mermaid, units (the ids of the units it covers) and isSuggestion. ${DIAGRAM_RULES}`;
}

/** Instructions for rewriting one part of a digest as the reviewer asks. The answer's shape is enforced separately. */
export function buildRevisionPrompt(input: iRevisionPromptInput) {
  const diff = input.patch ? `\nThe diff of the code it is about:\n\`\`\`diff\n${input.patch}\n\`\`\`\n` : '';
  return `You are rewriting ${DIGEST_PART_PROMPT_NAMES.get(input.current.part)} for a human reviewer in Chaff. The reviewer decides everything; your job is to make the code faster to read. You can read and search files in the working directory, which is a checkout of the branch's head commit. Do not try to change anything.

Branch \`${input.branch}\` is compared with its parent \`${input.parentBranch}\` (merge base ${input.baseSha.slice(0, 10)}, head ${input.headSha.slice(0, 10)}).

Units of change. Refer to units only by these ids:
${input.units.map(describeUnit).join('\n')}

${describeDiffFiles(input.diffDirectory)}
${diff}
The version the reviewer sees now:
${describeCurrent(input.current, input.units)}

The reviewer asks for this:
${input.instructions}

Rewrite it as asked. Keep what the reviewer did not ask to change, and keep every claim true to the code: read the code wherever the request needs it.

Answer with:
${describeAnswer(input.current, input.units)}

${STYLE_RULES}`;
}
