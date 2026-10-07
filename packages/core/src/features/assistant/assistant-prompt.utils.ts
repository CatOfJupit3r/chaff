import { STYLE_RULES } from '@~/features/digests/digest-prompt.constants';
import { describeDiffFiles, describeUnit } from '@~/features/digests/digest-prompt.utils';
import type { iDigestContent, iPromptUnit } from '@~/features/digests/digests.types';

import type { iAssistantPromptInput } from './assistant.types';

/** What the digest says about the card's units: their changes' intent, their notes and their diagrams. */
function describeDigest(digest: iDigestContent | undefined, units: readonly iPromptUnit[]) {
  if (!digest) return '';
  const unitIds = new Set(units.map((unit) => unit.unitId));
  const covers = (ids: readonly string[]) => ids.some((id) => unitIds.has(id));
  const shortIdOf = (unitId: string) => units.find((unit) => unit.unitId === unitId)?.shortId ?? unitId;
  const groups = digest.groups
    .filter((group) => !group.isUnexplained && covers(group.unitIds))
    .map((group) => `- ${group.title}. Before: ${group.before} After: ${group.after} Intent: ${group.intent}`);
  const notes = digest.units
    .filter((note) => unitIds.has(note.unitId))
    .map((note) => {
      const checks = note.worthChecking.length > 0 ? ` Worth checking: ${note.worthChecking.join('; ')}` : '';
      return `- ${shortIdOf(note.unitId)}: ${note.summary}${checks}`;
    });
  const diagrams = digest.diagrams
    .filter((diagram) => covers(diagram.unitIds))
    .map((diagram) => `${diagram.title}:\n\`\`\`mermaid\n${diagram.mermaid}\n\`\`\``);
  const sections = [
    groups.length > 0 ? `The changes they belong to:\n${groups.join('\n')}` : '',
    notes.length > 0 ? `Notes on the units:\n${notes.join('\n')}` : '',
    diagrams.length > 0 ? `Diagrams of them:\n${diagrams.join('\n\n')}` : '',
  ].filter(Boolean);
  if (sections.length === 0) return '';
  return `
What the review digest, written earlier by an agent, says about this card. It can be wrong; the code decides:
${sections.join('\n\n')}
`;
}

function describeEarlier(earlier: iAssistantPromptInput['earlier']) {
  if (earlier.length === 0) return '';
  const exchanges = earlier.map(
    (exchange) => `Reviewer: ${exchange.question}\nYou: ${exchange.answer ?? '(no answer)'}`,
  );
  return `
The conversation about this card so far, oldest first:
${exchanges.join('\n\n')}
`;
}

/** Asks for an answer to the reviewer's question about one card, from the code. */
export function buildAnswerPrompt(input: iAssistantPromptInput) {
  const diff = input.patch ? `\nThe diff of the card's files:\n\`\`\`diff\n${input.patch}\n\`\`\`\n` : '';
  return `A human reviewer in Chaff is reviewing one card of a branch and asks you about it. Answer from the code. You can read and search files in the working directory, which is a checkout of the branch's head commit. Do not try to change anything.

Branch \`${input.branch}\` is compared with its parent \`${input.parentBranch}\` (merge base ${input.baseSha.slice(0, 10)}, head ${input.headSha.slice(0, 10)}).

The card is "${input.cardTitle}". Its units of change:
${input.units.map(describeUnit).join('\n')}

${describeDiffFiles(input.diffDirectory)}
${diff}${describeDigest(input.digest, input.units)}${describeEarlier(input.earlier)}
The reviewer asks:
${input.question}

Answer in Markdown in the answer field. Answer what was asked and stop: lead with the direct answer, then the evidence, naming files and lines (\`path:line\`). When you explain a change, say what it did before, what it does now and what that affects. When the code cannot settle the question, say so and say what would. A Mermaid diagram in a \`\`\`mermaid block is welcome where it explains more than words. Do not judge whether the change should be accepted: the reviewer decides.

${STYLE_RULES}`;
}
