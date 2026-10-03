/** One preference as a Markdown list item, on one line. */
const bullet = (text: string) => `- ${text.replaceAll(/\s*\n\s*/g, ' ')}`;

/** A Markdown section for CLAUDE.md or AGENTS.md listing the repository's preferences. */
export function preferencesSnippet(texts: readonly string[]) {
  return [
    '## Review preferences',
    '',
    'Stated by the reviewer in Chaff. Follow them when you change this repository.',
    '',
    ...texts.map(bullet),
    '',
  ].join('\n');
}

/** The preferences as a prompt section for an agent, or nothing when there are none. */
export function preferencesPromptSection(texts: readonly string[], instruction: string) {
  if (texts.length === 0) return '';
  return [instruction, ...texts.map(bullet)].join('\n');
}
