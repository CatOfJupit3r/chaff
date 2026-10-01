import { EDITOR_URL_SCHEMES } from '@chaff/common/enums/editors.enums';
import type { Editor } from '@chaff/common/enums/editors.enums';

/**
 * Link that opens a file at a line in the chosen editor, e.g. `vscode://file/home/me/repo/src/app.ts:12:1`.
 * Windows paths become `vscode://file/C:/repo/...`.
 */
export function buildEditorFileUrl(editor: Editor, absolutePath: string, line = 1) {
  const forwardSlashes = absolutePath.replaceAll('\\', '/');
  const rooted = forwardSlashes.startsWith('/') ? forwardSlashes : `/${forwardSlashes}`;
  return `${EDITOR_URL_SCHEMES(editor)}://file${encodeURI(rooted)}:${line}:1`;
}

/** Joins a repository root and a repository-relative path with forward slashes. */
export function joinRepoPath(repoPath: string, relativePath: string) {
  return `${repoPath.replace(/[\\/]+$/, '')}/${relativePath.replace(/^[\\/]+/, '')}`;
}
