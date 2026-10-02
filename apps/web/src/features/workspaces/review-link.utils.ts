/** A merge request or pull request by number, in a named project or in the only linked one. */
interface iChangeLink {
  project?: string;
  number: number;
}

export type iReviewLink = iChangeLink | { branch: string };

const GITLAB_CHANGE_URL = /^https?:\/\/[^/]+\/(.+?)\/-\/merge_requests\/(\d+)/i;
const GITHUB_CHANGE_URL = /^https?:\/\/[^/]+\/([^/]+\/[^/]+)\/pull\/(\d+)/i;
const CHANGE_NUMBER = /^[!#](\d+)$/;
const BRANCH_NAME = /^[^\s~^:?*[\\]+$/;

/** Reads a merge request or pull request link, a `!412` / `#412` number, or a local branch name. */
export function parseReviewLink(text: string): iReviewLink | undefined {
  const value = text.trim();
  const url = GITLAB_CHANGE_URL.exec(value) ?? GITHUB_CHANGE_URL.exec(value);
  if (url?.[1] && url[2]) return { project: url[1], number: Number(url[2]) };
  const number = CHANGE_NUMBER.exec(value);
  if (number?.[1]) return { number: Number(number[1]) };
  if (BRANCH_NAME.test(value)) return { branch: value };
  return undefined;
}
