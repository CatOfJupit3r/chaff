import { BRANCH_TICKET_PATTERN, BRANCH_WORD_SEPARATOR } from './overview.constants';

function toPascalCase(text: string) {
  return text
    .split(BRANCH_WORD_SEPARATOR)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('');
}

/**
 * Readable title for a branch: each `/` segment in PascalCase, led by the ticket key when the name has one
 * (`AB-10313-assemble-the-workbench` becomes `AB-10313 | AssembleTheWorkbench`).
 */
export function formatBranchTitle(name: string) {
  let ticket: string | undefined;
  const segments = name.split('/').map((segment) => {
    const match = ticket ? null : BRANCH_TICKET_PATTERN.exec(segment);
    if (!match?.[1]) return toPascalCase(segment);
    ticket = match[1].toUpperCase();
    return toPascalCase(`${segment.slice(0, match.index)}-${segment.slice(match.index + match[0].length)}`);
  });
  const title = segments.filter(Boolean).join('/');
  if (!ticket) return title || name;
  return title ? `${ticket} | ${title}` : ticket;
}
