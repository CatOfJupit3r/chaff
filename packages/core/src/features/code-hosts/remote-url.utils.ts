function toRemote(hostname: string, rawPath: string) {
  const project = rawPath
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');
  if (!hostname || !project.includes('/')) return undefined;
  return { hostname: hostname.toLowerCase(), project };
}

/** Host name and project path of a git remote URL, or undefined for a local path or an unknown form. */
export function parseRemoteUrl(remoteUrl: string) {
  const trimmed = remoteUrl.trim();
  // scp-like form: git@gitlab.com:group/project.git
  const scpLike = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(trimmed);
  if (scpLike && !trimmed.includes('://')) {
    return toRemote(scpLike[1] ?? '', scpLike[2] ?? '');
  }
  try {
    const url = new URL(trimmed);
    if (!['https:', 'http:', 'ssh:', 'git:'].includes(url.protocol)) return undefined;
    return toRemote(url.hostname, decodeURIComponent(url.pathname));
  } catch {
    return undefined;
  }
}

/** A project path is two or more segments of letters, digits, dots, dashes and underscores. */
export const REMOTE_PROJECT_PATTERN = /^[\w.-]+(?:\/[\w.-]+)+$/;
