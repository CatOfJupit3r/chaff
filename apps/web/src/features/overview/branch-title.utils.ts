import { BRANCH_TICKET_PATTERN, BRANCH_WORD_SEPARATOR } from './overview.constants';

function toTitleWords(text: string) {
  return text
    .split(BRANCH_WORD_SEPARATOR)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

/**
 * Readable title for a branch: the words of each `/` segment capitalized, led by the ticket key when the name
 * has one (`PROJ-482-add-the-retry-queue` becomes `PROJ-482 | Add The Retry Queue`).
 */
export function formatBranchTitle(name: string) {
  let ticket: string | undefined;
  const segments = name.split('/').map((segment) => {
    const match = ticket ? null : BRANCH_TICKET_PATTERN.exec(segment);
    if (!match?.[1]) return toTitleWords(segment);
    ticket = match[1].toUpperCase();
    return toTitleWords(`${segment.slice(0, match.index)}-${segment.slice(match.index + match[0].length)}`);
  });
  const title = segments.filter(Boolean).join(' / ');
  if (!ticket) return title || name;
  return title ? `${ticket} | ${title}` : ticket;
}
