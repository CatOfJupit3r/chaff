export const LOCAL_BRANCH_PREFIX = 'refs/heads/';
export const REMOTE_BRANCH_PREFIX = 'refs/remotes/';
const DEFAULT_REMOTE = 'origin';
/** The symbolic ref a clone keeps for the remote's default branch; it is not a branch of its own. */
const REMOTE_HEAD = 'HEAD';

/** A branch of the repository: a local branch, or a remote-tracking branch with no local branch of its name. */
export interface iBranchRef {
  name: string;
  /** Full ref name, such as `refs/heads/feature` or `refs/remotes/origin/feature`. */
  ref: string;
  /** Set when the branch is read from a remote-tracking ref. */
  remote?: string;
}

/** Remote names with `origin` first, then the others in alphabetical order. */
export function orderRemotes(remotes: readonly string[]) {
  return [...new Set(remotes.filter(Boolean))].sort(
    (left, right) => Number(right === DEFAULT_REMOTE) - Number(left === DEFAULT_REMOTE) || left.localeCompare(right),
  );
}

/**
 * The branch a full ref name stands for, or undefined when the ref is not a branch (a tag, `origin/HEAD`, or a
 * remote-tracking ref of a remote that is no longer configured). A remote whose name contains a slash is
 * matched by its longest name.
 */
export function parseBranchRef(ref: string, remotes: readonly string[]): iBranchRef | undefined {
  if (ref.startsWith(LOCAL_BRANCH_PREFIX)) return { name: ref.slice(LOCAL_BRANCH_PREFIX.length), ref };
  if (!ref.startsWith(REMOTE_BRANCH_PREFIX)) return undefined;
  const rest = ref.slice(REMOTE_BRANCH_PREFIX.length);
  const remote = remotes
    .filter((candidate) => rest.startsWith(`${candidate}/`))
    .sort((left, right) => right.length - left.length)[0];
  if (!remote) return undefined;
  const name = rest.slice(remote.length + 1);
  return name && name !== REMOTE_HEAD ? { name, ref, remote } : undefined;
}

/**
 * One ref per branch name: the local branch when there is one, else the remote-tracking branch of the first
 * remote in `remotes` order. Keeps the input order of the refs that stay.
 */
export function preferLocal<TRef extends iBranchRef>(refs: readonly TRef[], remotes: readonly string[]): TRef[] {
  const rank = (ref: TRef) => {
    if (ref.remote === undefined) return -1;
    const index = remotes.indexOf(ref.remote);
    return index === -1 ? remotes.length : index;
  };
  const chosen = new Map<string, TRef>();
  for (const ref of refs) {
    const current = chosen.get(ref.name);
    if (!current || rank(ref) < rank(current)) chosen.set(ref.name, ref);
  }
  return refs.filter((ref) => chosen.get(ref.name) === ref);
}
