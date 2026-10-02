export const LOCAL_BRANCH_REFS = 'refs/heads';
export const REMOTE_BRANCH_REFS = 'refs/remotes';

/**
 * The branch name Chaff shows for a ref: `feature` for a local branch, `origin/feature` for a remote-tracking
 * one. Anything else, such as a tag or a remote's symbolic HEAD, is not a branch.
 */
export function branchNameOfRef(ref: string) {
  if (ref.startsWith(`${LOCAL_BRANCH_REFS}/`)) return ref.slice(LOCAL_BRANCH_REFS.length + 1);
  if (ref.startsWith(`${REMOTE_BRANCH_REFS}/`) && !ref.endsWith('/HEAD')) {
    return ref.slice(REMOTE_BRANCH_REFS.length + 1);
  }
  return undefined;
}

/** The local branch a remote-tracking branch stands for: `feature` for `origin/feature`. */
export function localNameOfRemote(remoteName: string) {
  return remoteName.slice(remoteName.indexOf('/') + 1);
}
